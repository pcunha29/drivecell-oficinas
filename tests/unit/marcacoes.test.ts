import { describe, expect, it } from "vitest";
import {
  addDays,
  buildCalendarEvents,
  compareEvents,
  formatTimeRange,
  formatWeekRange,
  gridHours,
  isMuted,
  isValidDay,
  isoWeekday,
  layoutTimedEvents,
  nextHalfHour,
  nowMinutes,
  startOfWeek,
  todayKey,
  weekDays,
  type CalendarEvent,
} from "@/lib/calendar";
import { appointmentFormSchema } from "@/lib/appointment-form-schema";
import { orderFormSchema } from "@/lib/order-form-schema";
import { mapAppointment, shortTime } from "@/lib/supabase/mappers";
import type { Appointment, Customer, ServiceOrder, Vehicle } from "@/types";

describe("dias (sem fuso)", () => {
  it("soma dias atravessando as mudanças de hora e de mês/ano", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("a semana começa à segunda, também quando o dia é domingo", () => {
    expect(isoWeekday("2026-11-02")).toBe(1);
    expect(isoWeekday("2026-11-08")).toBe(7);
    expect(startOfWeek("2026-11-08")).toBe("2026-11-02");
    expect(startOfWeek("2026-11-02")).toBe("2026-11-02");
    expect(weekDays("2026-10-28")).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("valida datas reais", () => {
    expect(isValidDay("2026-02-28")).toBe(true);
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("2026-2-3")).toBe(false);
    expect(isValidDay("")).toBe(false);
  });

  it("«hoje» e «agora» são sempre em Lisboa, mesmo com o relógio em UTC", () => {
    // 23:30 UTC no verão = 00:30 de dia seguinte em Lisboa.
    const summerNight = new Date("2026-07-14T23:30:00Z");
    expect(todayKey(summerNight)).toBe("2026-07-15");
    expect(nowMinutes(summerNight)).toBe(30);
    // No inverno Lisboa = UTC.
    const winterNight = new Date("2026-12-14T23:30:00Z");
    expect(todayKey(winterNight)).toBe("2026-12-14");
    expect(nowMinutes(winterNight)).toBe(23 * 60 + 30);
  });

  it("a próxima meia hora", () => {
    expect(nextHalfHour(new Date("2026-12-14T09:10:00Z"))).toBe("09:30");
    expect(nextHalfHour(new Date("2026-12-14T09:30:00Z"))).toBe("10:00");
    expect(nextHalfHour(new Date("2026-12-14T23:50:00Z"))).toBe("23:30");
  });

  it("textos em português", () => {
    expect(formatWeekRange("2026-11-04")).toBe("2 – 8 de novembro de 2026");
    expect(formatWeekRange("2026-10-28")).toBe("26 de outubro – 1 de novembro de 2026");
    expect(formatWeekRange("2026-12-30")).toBe("28 de dezembro de 2026 – 3 de janeiro de 2027");
    expect(formatTimeRange("09:30", null)).toBe("09:30");
    expect(formatTimeRange("14:00", "16:30")).toBe("14:00–16:30");
    expect(formatTimeRange(null, null)).toBe("Sem hora");
  });
});

const customers: Customer[] = [{ id: "c1", slug: "c-1", name: "Ana Silva", phone: "", email: "", notes: "" }];
const vehicles: Vehicle[] = [{ id: "v1", customerId: "c1", plate: "AA-12-BC", make: "Renault", model: "Clio", year: 2019 }];

function order(overrides: Partial<ServiceOrder>): ServiceOrder {
  return {
    id: "o1",
    customerId: "c1",
    vehicleId: "v1",
    status: "waiting",
    description: "Pastilhas",
    notes: "",
    paid: false,
    items: [],
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    checkedInAt: null,
    checkedOutAt: null,
    expectedOn: null,
    expectedTime: null,
    ...overrides,
  };
}

function appointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: "a1",
    serviceType: "Lavagem",
    customerName: "Sr. João",
    phone: "",
    plate: "",
    customerId: null,
    vehicleId: null,
    day: "2026-11-03",
    startTime: "14:00",
    endTime: "16:00",
    status: "scheduled",
    notes: "",
    ...overrides,
  };
}

describe("eventos do calendário", () => {
  it("junta ordens com chegada prevista e marcações, só dentro do intervalo", () => {
    const events = buildCalendarEvents({
      orders: [
        order({ id: "o1", expectedOn: "2026-11-03", expectedTime: "09:00" }),
        order({ id: "o2", expectedOn: "2026-11-20" }),
        order({ id: "o3" }),
        order({ id: "o4", expectedOn: "2026-11-04", status: "in_progress", checkedInAt: "2026-11-04T08:00:00Z" }),
      ],
      appointments: [appointment({ id: "a1" }), appointment({ id: "a2", day: "2026-12-01" })],
      customers,
      vehicles,
      from: "2026-11-02",
      to: "2026-11-08",
    });
    expect(events.map((e) => e.key)).toEqual(["order:o1", "manual:a1", "order:o4"]);
    expect(events[0]).toMatchObject({ source: "order", plate: "AA-12-BC", customerName: "Ana Silva", start: "09:00", end: null, arrived: false });
    expect(events[1]).toMatchObject({ source: "manual", title: "Lavagem", start: "14:00", end: "16:00" });
    expect(events[2].arrived).toBe(true);
    expect(isMuted(events[2])).toBe(true);
  });

  it("um carro marcado pelos dois lados aparece duas vezes (não se bloqueia)", () => {
    const events = buildCalendarEvents({
      orders: [order({ expectedOn: "2026-11-03", expectedTime: "09:00" })],
      appointments: [appointment({ startTime: "09:00", endTime: null, plate: "AA-12-BC" })],
      customers,
      vehicles,
      from: "2026-11-02",
      to: "2026-11-08",
    });
    expect(events.map((e) => e.source).sort()).toEqual(["manual", "order"]);
  });

  it("canceladas e faltas ficam esbatidas", () => {
    const [canceled] = buildCalendarEvents({
      orders: [],
      appointments: [appointment({ status: "canceled" })],
      customers,
      vehicles,
      from: "2026-11-02",
      to: "2026-11-08",
    });
    expect(isMuted(canceled)).toBe(true);
  });

  const ev = (key: string, start: string | null, end: string | null = null, day = "2026-11-03"): CalendarEvent => ({
    key,
    source: "manual",
    refId: key,
    day,
    start,
    end,
    title: key,
    customerName: "",
    plate: "",
    status: "scheduled",
    arrived: false,
  });

  it("ordena por dia, sem hora primeiro, depois por hora", () => {
    const sorted = [ev("c", "10:00"), ev("a", null), ev("d", "09:00", "11:00"), ev("b", "09:00"), ev("z", null, null, "2026-11-02")].sort(
      compareEvents,
    );
    expect(sorted.map((e) => e.key)).toEqual(["z", "a", "b", "d", "c"]);
  });

  it("marcações sobrepostas ficam lado a lado, as outras ocupam a largura toda", () => {
    const layout = layoutTimedEvents([
      ev("wash", "09:00", "12:00"),
      ev("oil", "09:30"),
      ev("tyres", "10:00", "11:00"),
      ev("later", "14:00"),
      ev("allday", null),
    ]);
    const byKey = Object.fromEntries(layout.map((p) => [p.event.key, p]));
    expect(Object.keys(byKey).sort()).toEqual(["later", "oil", "tyres", "wash"]);
    expect(byKey.wash).toMatchObject({ column: 0, columns: 2 });
    expect(byKey.oil).toMatchObject({ column: 1, columns: 2, start: 9 * 60 + 30, end: 10 * 60 });
    // Começa quando a mudança de óleo (30 min) acaba: reutiliza a coluna 1.
    expect(byKey.tyres).toMatchObject({ column: 1, columns: 2 });
    expect(byKey.later).toMatchObject({ column: 0, columns: 1 });
  });

  it("a grelha vai das 7 às 20h e alarga para marcações fora desse horário", () => {
    expect(gridHours([ev("a", "09:00")])).toEqual({ startHour: 7, endHour: 20 });
    expect(gridHours([ev("a", "06:30"), ev("b", "20:00", "21:15")])).toEqual({ startHour: 6, endHour: 22 });
  });
});

describe("formulário da marcação", () => {
  const base = { serviceType: "Lavagem", customerName: "Sr. João", day: "2026-11-03" };

  it("aceita sem hora, hora certa e intervalo; matrícula em maiúsculas", () => {
    expect(appointmentFormSchema.safeParse(base).success).toBe(true);
    expect(appointmentFormSchema.safeParse({ ...base, startTime: "09:30" }).success).toBe(true);
    const range = appointmentFormSchema.parse({ ...base, startTime: "14:00", endTime: "16:00", plate: " aa-12-bc " });
    expect(range).toMatchObject({ startTime: "14:00", endTime: "16:00", plate: "AA-12-BC", status: "scheduled" });
  });

  it("exige tipo, cliente e dia, e o fim depois do início", () => {
    const empty = appointmentFormSchema.safeParse({ serviceType: " ", customerName: "", day: "" });
    expect(empty.error?.issues.map((i) => i.path[0]).sort()).toEqual(["customerName", "day", "serviceType"]);

    const backwards = appointmentFormSchema.safeParse({ ...base, startTime: "10:00", endTime: "09:00" });
    expect(backwards.error?.issues[0]).toMatchObject({ path: ["endTime"], message: "A hora de fim tem de ser depois da de início." });

    const endOnly = appointmentFormSchema.safeParse({ ...base, endTime: "10:00" });
    expect(endOnly.error?.issues[0].path).toEqual(["startTime"]);
  });

  it("respeita os limites da base de dados", () => {
    expect(appointmentFormSchema.safeParse({ ...base, customerName: "x".repeat(121) }).success).toBe(false);
    expect(appointmentFormSchema.safeParse({ ...base, phone: "9".repeat(31) }).success).toBe(false);
    expect(appointmentFormSchema.safeParse({ ...base, plate: "x".repeat(21) }).success).toBe(false);
  });
});

describe("chegada prevista na ordem", () => {
  const order = { vehicleId: "v1", customerId: "c1", status: "waiting", description: "Travões" } as const;

  it("a hora é opcional, mas precisa do dia", () => {
    expect(orderFormSchema.safeParse({ ...order, expectedOn: "2026-11-12" }).success).toBe(true);
    expect(orderFormSchema.safeParse({ ...order, expectedOn: "2026-11-12", expectedTime: "09:30" }).success).toBe(true);
    const timeOnly = orderFormSchema.safeParse({ ...order, expectedTime: "09:30" });
    expect(timeOnly.error?.issues[0].path).toEqual(["expectedOn"]);
  });
});

describe("mapeamento da base de dados", () => {
  it("corta os segundos das horas", () => {
    expect(shortTime("09:30:00")).toBe("09:30");
    expect(shortTime(null)).toBeNull();
    expect(
      mapAppointment({
        id: "a1",
        workshop_id: "w1",
        service_type: "Lavagem",
        customer_name: "Sr. João",
        phone: "",
        plate: "",
        customer_id: null,
        vehicle_id: null,
        day: "2026-11-03",
        start_time: "14:00:00",
        end_time: "16:30:00",
        status: "scheduled",
        notes: "",
        created_by: null,
        created_at: "",
        updated_at: "",
      }),
    ).toMatchObject({ startTime: "14:00", endTime: "16:30" });
  });
});
