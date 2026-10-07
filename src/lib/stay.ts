import type { ServiceOrder } from "@/types";

/**
 * Entrada e saída das viaturas (tempo na oficina).
 * As datas vêm da base de dados (marcadas ao passar a "Em curso" e a "Entregue",
 * e corrigíveis na ordem). Código puro: sem acesso a dados.
 */

/** A partir de quantos dias um carro na oficina aparece com aviso. */
export const STALE_AFTER_DAYS = 7;

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_MS = 86_400_000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Dias de calendário entre duas datas (hora local): ontem às 18h → hoje às 9h = 1. */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

/** O carro está cá: tem entrada e a ordem ainda não foi entregue. */
export function isInWorkshop(order: Pick<ServiceOrder, "status" | "checkedInAt">): boolean {
  return Boolean(order.checkedInAt) && order.status !== "delivered";
}

/** Dias desde a entrada (só para carros que estão na oficina). */
export function daysInWorkshop(
  order: Pick<ServiceOrder, "status" | "checkedInAt">,
  now: Date = new Date(),
): number | null {
  if (!isInWorkshop(order)) return null;
  return Math.max(0, calendarDaysBetween(new Date(order.checkedInAt!), now));
}

/** "Entrou hoje", "Na oficina há 1 dia", "Na oficina há 9 dias". */
export function inWorkshopLabel(days: number): string {
  if (days <= 0) return "Entrou hoje";
  return `Na oficina há ${days} ${days === 1 ? "dia" : "dias"}`;
}

export type CarsInWorkshop = {
  count: number;
  /** Quantos estão cá há STALE_AFTER_DAYS dias ou mais. */
  stale: number;
  /** O que está cá há mais tempo. */
  oldest: { order: ServiceOrder; days: number } | null;
};

export function carsInWorkshop(orders: ServiceOrder[], now: Date = new Date()): CarsInWorkshop {
  let count = 0;
  let stale = 0;
  let oldest: CarsInWorkshop["oldest"] = null;
  for (const order of orders) {
    const days = daysInWorkshop(order, now);
    if (days === null) continue;
    count += 1;
    if (days >= STALE_AFTER_DAYS) stale += 1;
    if (!oldest || days > oldest.days) oldest = { order, days };
  }
  return { count, stale, oldest };
}

/** Duração da estadia em dias (com decimais), de ordens entregues com entrada e saída. */
export function stayDays(order: Pick<ServiceOrder, "checkedInAt" | "checkedOutAt">): number | null {
  if (!order.checkedInAt || !order.checkedOutAt) return null;
  const ms = new Date(order.checkedOutAt).getTime() - new Date(order.checkedInAt).getTime();
  return ms >= 0 ? ms / DAY_MS : null;
}

/** Ordens entregues cuja SAÍDA foi no período (ano e, opcionalmente, mês). */
export function deliveredInPeriod(orders: ServiceOrder[], year: number, month: number | null): ServiceOrder[] {
  return orders.filter((o) => {
    if (o.status !== "delivered" || !o.checkedOutAt) return false;
    const out = new Date(o.checkedOutAt);
    if (out.getFullYear() !== year) return false;
    return month === null || out.getMonth() + 1 === month;
  });
}

export type StaySummary = {
  /** Média em dias; null sem estadias completas. */
  average: number | null;
  /** Estadias completas (com entrada e saída) usadas na média. */
  count: number;
  /** Entregues sem data de entrada (ficam de fora da média). */
  missingEntry: number;
  longest: { order: ServiceOrder; days: number } | null;
};

export function staySummary(delivered: ServiceOrder[]): StaySummary {
  let sum = 0;
  let count = 0;
  let missingEntry = 0;
  let longest: StaySummary["longest"] = null;
  for (const order of delivered) {
    const days = stayDays(order);
    if (days === null) {
      missingEntry += 1;
      continue;
    }
    sum += days;
    count += 1;
    if (!longest || days > longest.days) longest = { order, days };
  }
  return { average: count > 0 ? sum / count : null, count, missingEntry, longest };
}

export type StayMonth = {
  monthKey: string;
  monthLabel: string;
  year: number;
  month: number;
  average: number;
  count: number;
};

/** Tempo médio na oficina por mês de saída (só estadias completas). */
export function getStayByMonth(orders: ServiceOrder[]): StayMonth[] {
  const byKey: Record<string, { sum: number; count: number; year: number; month: number }> = {};
  for (const order of orders) {
    if (order.status !== "delivered") continue;
    const days = stayDays(order);
    if (days === null) continue;
    const out = new Date(order.checkedOutAt!);
    const year = out.getFullYear();
    const month = out.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const row = byKey[key] ?? (byKey[key] = { sum: 0, count: 0, year, month });
    row.sum += days;
    row.count += 1;
  }
  return Object.entries(byKey)
    .map(([monthKey, r]) => ({
      monthKey,
      monthLabel: MONTH_NAMES[r.month - 1],
      year: r.year,
      month: r.month,
      average: r.sum / r.count,
      count: r.count,
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

/** "2,4 dias", "1 dia", "menos de 1 dia". */
export function formatDays(days: number): string {
  if (days < 1) return "menos de 1 dia";
  const rounded = Math.round(days * 10) / 10;
  const text = rounded.toLocaleString("pt-PT", { maximumFractionDigits: 1 });
  return `${text} ${rounded === 1 ? "dia" : "dias"}`;
}

// ---------------------------------------------------------------------------
// Campos <input type="datetime-local"> (hora local, sem fuso)
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO da base de dados → "AAAA-MM-DDTHH:mm" na hora local; "" se vazio. */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "AAAA-MM-DDTHH:mm" (hora local) → ISO; null se vazio ou inválido. */
export function fromDateTimeLocal(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
