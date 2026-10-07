import { describe, expect, it } from "vitest";
import {
  STALE_AFTER_DAYS,
  calendarDaysBetween,
  carsInWorkshop,
  daysInWorkshop,
  deliveredInPeriod,
  formatDays,
  fromDateTimeLocal,
  getStayByMonth,
  inWorkshopLabel,
  staySummary,
  toDateTimeLocal,
} from "@/lib/stay";
import { orderFormSchema } from "@/lib/order-form-schema";
import type { ServiceOrder } from "@/types";

// Fuso de Lisboa (vitest.config.mts). Datas a meio do dia para não depender da hora de verão.
const NOW = new Date("2026-10-07T15:00:00");

let seq = 0;
function order(partial: Partial<ServiceOrder>): ServiceOrder {
  seq += 1;
  return {
    id: `o-${seq}`,
    vehicleId: `v-${seq}`,
    customerId: "c-1",
    status: "in_progress",
    description: "",
    notes: "",
    paid: false,
    items: [],
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    checkedInAt: null,
    checkedOutAt: null,
    ...partial,
  };
}

describe("dias na oficina", () => {
  it("conta dias de calendário, não blocos de 24 horas", () => {
    expect(calendarDaysBetween(new Date("2026-10-06T18:00:00"), new Date("2026-10-07T09:00:00"))).toBe(1);
    expect(calendarDaysBetween(new Date("2026-10-07T08:00:00"), new Date("2026-10-07T20:00:00"))).toBe(0);
  });

  it("só conta carros com entrada e ainda não entregues", () => {
    expect(daysInWorkshop(order({ checkedInAt: "2026-10-04T10:00:00" }), NOW)).toBe(3);
    expect(daysInWorkshop(order({ status: "waiting", checkedInAt: null }), NOW)).toBeNull();
    expect(
      daysInWorkshop(order({ status: "delivered", checkedInAt: "2026-10-01T10:00:00", checkedOutAt: "2026-10-03T10:00:00" }), NOW),
    ).toBeNull();
    // Em espera mas com o carro já cá (entrada corrigida à mão) também conta.
    expect(daysInWorkshop(order({ status: "waiting", checkedInAt: "2026-10-06T10:00:00" }), NOW)).toBe(1);
  });

  it("escreve a etiqueta do cartão", () => {
    expect(inWorkshopLabel(0)).toBe("Entrou hoje");
    expect(inWorkshopLabel(1)).toBe("Na oficina há 1 dia");
    expect(inWorkshopLabel(9)).toBe("Na oficina há 9 dias");
  });

  it("resume os carros na oficina agora, com os parados", () => {
    const orders = [
      order({ checkedInAt: "2026-10-07T09:00:00" }),
      order({ status: "done", checkedInAt: "2026-09-28T09:00:00" }),
      order({ checkedInAt: "2026-10-03T09:00:00" }),
      order({ status: "waiting" }),
      order({ status: "delivered", checkedInAt: "2026-09-01T09:00:00", checkedOutAt: "2026-09-02T09:00:00" }),
    ];
    const summary = carsInWorkshop(orders, NOW);
    expect(summary.count).toBe(3);
    expect(summary.stale).toBe(1);
    expect(summary.oldest?.days).toBe(9);
    expect(summary.oldest?.days).toBeGreaterThanOrEqual(STALE_AFTER_DAYS);
    expect(carsInWorkshop([], NOW)).toEqual({ count: 0, stale: 0, oldest: null });
  });
});

describe("tempo médio na oficina", () => {
  const delivered = [
    order({ status: "delivered", checkedInAt: "2026-09-01T09:00:00Z", checkedOutAt: "2026-09-03T09:00:00Z" }), // 2 dias
    order({ status: "delivered", checkedInAt: "2026-09-10T09:00:00Z", checkedOutAt: "2026-09-14T21:00:00Z" }), // 4,5 dias
    order({ status: "delivered", checkedInAt: null, checkedOutAt: "2026-09-20T09:00:00Z" }), // sem entrada
    order({ status: "delivered", checkedInAt: "2026-08-01T09:00:00Z", checkedOutAt: "2026-08-02T09:00:00Z" }), // agosto, 1 dia
  ];

  it("filtra pela data de saída", () => {
    expect(deliveredInPeriod(delivered, 2026, 9)).toHaveLength(3);
    expect(deliveredInPeriod(delivered, 2026, null)).toHaveLength(4);
    expect(deliveredInPeriod(delivered, 2025, null)).toHaveLength(0);
  });

  it("calcula a média, a mais longa e as que ficam de fora", () => {
    const s = staySummary(deliveredInPeriod(delivered, 2026, 9));
    expect(s.average).toBeCloseTo(3.25);
    expect(s.count).toBe(2);
    expect(s.missingEntry).toBe(1);
    expect(s.longest?.days).toBeCloseTo(4.5);
    expect(staySummary([]).average).toBeNull();
  });

  it("agrupa por mês de saída", () => {
    expect(getStayByMonth(delivered).map((m) => [m.monthKey, m.monthLabel, m.count, Number(m.average.toFixed(2))])).toEqual([
      ["2026-08", "Agosto", 1, 1],
      ["2026-09", "Setembro", 2, 3.25],
    ]);
  });

  it("formata os dias em português", () => {
    expect(formatDays(0.4)).toBe("menos de 1 dia");
    expect(formatDays(1)).toBe("1 dia");
    expect(formatDays(3.25)).toBe("3,3 dias");
    expect(formatDays(12)).toBe("12 dias");
  });
});

describe("campos de data e hora da ordem", () => {
  it("converte entre a base de dados e o campo do formulário (hora local)", () => {
    const local = toDateTimeLocal("2026-10-07T08:30:00.000Z");
    expect(local).toBe("2026-10-07T09:30"); // Lisboa no verão = UTC+1
    expect(fromDateTimeLocal(local)).toBe("2026-10-07T08:30:00.000Z");
    expect(toDateTimeLocal(null)).toBe("");
    expect(fromDateTimeLocal("")).toBeNull();
    expect(fromDateTimeLocal("isto não é data")).toBeNull();
  });

  it("não deixa gravar uma saída antes da entrada", () => {
    const base = { vehicleId: "v", customerId: "c", description: "Revisão" };
    const bad = orderFormSchema.safeParse({
      ...base,
      status: "delivered",
      checkedInAt: "2026-10-07T10:00",
      checkedOutAt: "2026-10-06T10:00",
    });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0].path).toEqual(["checkedOutAt"]);

    // Fora de "Entregue" a saída é ignorada (a base de dados apaga-a).
    expect(
      orderFormSchema.safeParse({ ...base, status: "done", checkedInAt: "2026-10-07T10:00", checkedOutAt: "2026-10-06T10:00" }).success,
    ).toBe(true);
  });
});
