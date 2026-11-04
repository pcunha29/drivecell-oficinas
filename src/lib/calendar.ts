import type { Appointment, AppointmentStatus, Customer, ServiceOrder, Vehicle } from "@/types";

/**
 * Marcações: datas e horas de parede, sem fuso.
 * Dias são "AAAA-MM-DD" e horas "HH:MM". As contas de dias fazem-se em UTC (Date.UTC),
 * por isso a mudança de hora nunca desloca um dia. Só "hoje" e "agora" dependem do fuso:
 * usam sempre Europe/Lisbon, para o servidor (UTC) e o telemóvel darem o mesmo dia.
 * Código puro: sem acesso a dados.
 */

export const CALENDAR_TIME_ZONE = "Europe/Lisbon";

/** Duração com que se desenha uma marcação de hora certa (sem fim). */
export const POINT_DURATION_MIN = 30;

/** Horário mostrado por omissão na grelha; alarga se houver marcações fora dele. */
export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 20;

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (n: number) => String(n).padStart(2, "0");

export function isValidDay(value: string | null | undefined): value is string {
  if (!value || !DAY_RE.test(value)) return false;
  return fromUtc(dayToUtc(value)) === value;
}

export function isValidTime(value: string | null | undefined): value is string {
  return !!value && TIME_RE.test(value);
}

function dayToUtc(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(day: string, days: number): string {
  return fromUtc(dayToUtc(day) + days * DAY_MS);
}

/** 1 = segunda … 7 = domingo. */
export function isoWeekday(day: string): number {
  const weekday = new Date(dayToUtc(day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/** Segunda-feira da semana do dia. */
export function startOfWeek(day: string): string {
  return addDays(day, 1 - isoWeekday(day));
}

/** Os 7 dias (segunda a domingo) da semana do dia. */
export function weekDays(day: string): string[] {
  const monday = startOfWeek(day);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function zonedParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** Hoje em Lisboa, como "AAAA-MM-DD". */
export function todayKey(now: Date = new Date(), timeZone: string = CALENDAR_TIME_ZONE): string {
  return zonedParts(now, timeZone).day;
}

/** Minutos desde a meia-noite, agora, em Lisboa. */
export function nowMinutes(now: Date = new Date(), timeZone: string = CALENDAR_TIME_ZONE): number {
  return zonedParts(now, timeZone).minutes;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.min(Math.max(Math.round(minutes), 0), 23 * 60 + 59);
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/** Próxima meia hora a partir de agora (para pré-preencher «Nova marcação»). */
export function nextHalfHour(now: Date = new Date()): string {
  const minutes = Math.ceil((nowMinutes(now) + 1) / 30) * 30;
  return minutesToTime(Math.min(minutes, 23 * 60 + 30));
}

// ---------------------------------------------------------------------------
// Textos (pt-PT)
// ---------------------------------------------------------------------------

function formatUtc(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-PT", { ...options, timeZone: "UTC" }).format(new Date(dayToUtc(day)));
}

/** "terça-feira, 4 de novembro" */
export function formatDayLong(day: string): string {
  return formatUtc(day, { weekday: "long", day: "numeric", month: "long" });
}

/** "ter." */
export function formatWeekdayShort(day: string): string {
  return formatUtc(day, { weekday: "short" });
}

/** "12 nov." */
export function formatDayMonth(day: string): string {
  return formatUtc(day, { day: "numeric", month: "short" });
}

/** "3 – 9 de novembro de 2026", "27 de outubro – 2 de novembro de 2026". */
export function formatWeekRange(day: string): string {
  const monday = startOfWeek(day);
  const sunday = addDays(monday, 6);
  const [y1, m1] = monday.split("-");
  const [y2, m2] = sunday.split("-");
  const endLabel = formatUtc(sunday, { day: "numeric", month: "long", year: "numeric" });
  if (y1 === y2 && m1 === m2) return `${Number(monday.slice(8))} – ${endLabel}`;
  if (y1 === y2) return `${formatUtc(monday, { day: "numeric", month: "long" })} – ${endLabel}`;
  return `${formatUtc(monday, { day: "numeric", month: "long", year: "numeric" })} – ${endLabel}`;
}

/** "09:30", "14:00–16:30" ou "Sem hora". */
export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return "Sem hora";
  return end ? `${start}–${end}` : start;
}

// ---------------------------------------------------------------------------
// Eventos do calendário (ordens com chegada prevista + marcações manuais)
// ---------------------------------------------------------------------------

export type CalendarEventSource = "order" | "manual";

export type CalendarEvent = {
  /** Único entre as duas fontes. */
  key: string;
  source: CalendarEventSource;
  /** id da ordem ou da marcação. */
  refId: string;
  day: string;
  start: string | null;
  end: string | null;
  /** Tipo de serviço (manual) ou descrição da ordem. */
  title: string;
  customerName: string;
  plate: string;
  /** Marcações manuais: estado. */
  status: AppointmentStatus | null;
  /** Ordens: o carro já entrou na oficina. */
  arrived: boolean;
};

/** Aparece esbatida: canceladas, faltas e carros que já entraram. */
export function isMuted(event: CalendarEvent): boolean {
  return event.arrived || (event.status !== null && event.status !== "scheduled");
}

export function buildCalendarEvents({
  orders,
  appointments,
  customers,
  vehicles,
  from,
  to,
}: {
  orders: ServiceOrder[];
  appointments: Appointment[];
  customers: Customer[];
  vehicles: Vehicle[];
  /** Primeiro e último dia (inclusive). */
  from: string;
  to: string;
}): CalendarEvent[] {
  const customerName = new Map(customers.map((c) => [c.id, c.name]));
  const plate = new Map(vehicles.map((v) => [v.id, v.plate]));
  const inRange = (day: string) => day >= from && day <= to;
  const events: CalendarEvent[] = [];

  for (const order of orders) {
    if (!order.expectedOn || !inRange(order.expectedOn)) continue;
    events.push({
      key: `order:${order.id}`,
      source: "order",
      refId: order.id,
      day: order.expectedOn,
      start: order.expectedTime ?? null,
      end: null,
      title: order.description.trim() || "Ordem de reparação",
      customerName: customerName.get(order.customerId) ?? "",
      plate: plate.get(order.vehicleId) ?? "",
      status: null,
      arrived: Boolean(order.checkedInAt) || order.status !== "waiting",
    });
  }

  for (const appointment of appointments) {
    if (!inRange(appointment.day)) continue;
    events.push({
      key: `manual:${appointment.id}`,
      source: "manual",
      refId: appointment.id,
      day: appointment.day,
      start: appointment.startTime,
      end: appointment.startTime ? appointment.endTime : null,
      title: appointment.serviceType,
      customerName: appointment.customerName,
      plate: appointment.plate,
      status: appointment.status,
      arrived: false,
    });
  }

  return events.sort(compareEvents);
}

/** Dia; depois as sem hora; depois por hora de início e de fim. */
export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  if (!a.start || !b.start) {
    if (a.start === b.start) return a.title.localeCompare(b.title, "pt");
    return a.start ? 1 : -1;
  }
  if (a.start !== b.start) return a.start < b.start ? -1 : 1;
  const aEnd = a.end ?? a.start;
  const bEnd = b.end ?? b.start;
  if (aEnd !== bEnd) return aEnd < bEnd ? -1 : 1;
  return a.key.localeCompare(b.key);
}

export function eventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = map.get(event.day);
    if (list) list.push(event);
    else map.set(event.day, [event]);
  }
  return map;
}

export function eventMinutes(event: Pick<CalendarEvent, "start" | "end">): { start: number; end: number } | null {
  if (!event.start) return null;
  const start = timeToMinutes(event.start);
  const end = event.end ? timeToMinutes(event.end) : start + POINT_DURATION_MIN;
  return { start, end: Math.max(end, start + 15) };
}

export type PositionedEvent = {
  event: CalendarEvent;
  start: number;
  end: number;
  /** Coluna (0…columns-1) dentro do grupo de marcações que se sobrepõem. */
  column: number;
  columns: number;
};

/**
 * Lado a lado quando se sobrepõem (como no Google Calendar): cada grupo de marcações
 * encadeadas divide a largura pelo número de colunas de que precisa.
 */
export function layoutTimedEvents(events: CalendarEvent[]): PositionedEvent[] {
  const timed = events
    .map((event) => ({ event, minutes: eventMinutes(event) }))
    .filter((e): e is { event: CalendarEvent; minutes: { start: number; end: number } } => e.minutes !== null)
    .sort((a, b) => a.minutes.start - b.minutes.start || b.minutes.end - a.minutes.end);

  const result: PositionedEvent[] = [];
  let group: PositionedEvent[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    for (const item of group) item.columns = columnEnds.length;
    result.push(...group);
    group = [];
    columnEnds = [];
  };

  for (const { event, minutes } of timed) {
    if (group.length > 0 && minutes.start >= groupEnd) closeGroup();
    let column = columnEnds.findIndex((end) => end <= minutes.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(minutes.end);
    } else {
      columnEnds[column] = minutes.end;
    }
    group.push({ event, start: minutes.start, end: minutes.end, column, columns: 1 });
    groupEnd = Math.max(groupEnd, minutes.end);
  }
  if (group.length > 0) closeGroup();
  return result;
}

/** Horas da grelha: 07–20h, alargadas para mostrar marcações fora desse horário. */
export function gridHours(events: CalendarEvent[]): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const event of events) {
    const minutes = eventMinutes(event);
    if (!minutes) continue;
    startHour = Math.min(startHour, Math.floor(minutes.start / 60));
    endHour = Math.max(endHour, Math.min(24, Math.ceil(minutes.end / 60)));
  }
  return { startHour, endHour };
}
