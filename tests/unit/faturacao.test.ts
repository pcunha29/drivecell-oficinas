import { describe, expect, it } from "vitest";
import {
  costCoverage,
  getAvailableYears,
  getBillingByMonth,
  getProfitByMonth,
  linesBelowCost,
  orderMargins,
  ordersInPeriod,
  outstanding,
  totalCusto,
  totalFaturado,
  totalsByCustomer,
} from "@/lib/billing";
import type { ServiceItem, ServiceOrder } from "@/types";

let seq = 0;
function order(partial: Partial<ServiceOrder> & { items: ServiceItem[] }): ServiceOrder {
  seq += 1;
  return {
    id: `o-${seq}`,
    vehicleId: "v-1",
    customerId: "c-1",
    status: "delivered",
    description: "",
    notes: "",
    paid: true,
    createdAt: "2026-09-15T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
    ...partial,
  };
}

const item = (quantity: number, unitPrice: number, unitCost?: number | null): ServiceItem => ({
  description: "Linha",
  quantity,
  unitPrice,
  unitCost,
});

const ORDERS: ServiceOrder[] = [
  // setembro: 2 × 64 + 35 = 163 faturado; custo 2 × 40 = 80 (mão de obra sem custo)
  order({ items: [item(2, 64, 40), item(1, 35, null)], customerId: "c-1" }),
  // setembro, por cobrar: 100 faturado, custo 60
  order({ items: [item(1, 100, 60)], paid: false, customerId: "c-2", createdAt: "2026-09-02T12:00:00.000Z" }),
  // agosto: 50 faturado, sem custos
  order({ items: [item(1, 50)], customerId: "c-1", createdAt: "2026-08-20T12:00:00.000Z" }),
  // 2025: 200 faturado, custo 120
  order({ items: [item(1, 200, 120)], customerId: "c-3", createdAt: "2025-12-10T12:00:00.000Z" }),
  // Não conta: ainda não entregue
  order({ items: [item(1, 999, 1)], status: "done", paid: false }),
];

describe("faturado e custo", () => {
  it("só conta ordens entregues", () => {
    expect(totalFaturado(ORDERS)).toBe(163 + 100 + 50 + 200);
    expect(totalCusto(ORDERS)).toBe(80 + 60 + 120);
  });

  it("filtra por ano e por mês", () => {
    expect(totalFaturado(ORDERS, 2026)).toBe(313);
    expect(totalFaturado(ORDERS, 2026, 9)).toBe(263);
    expect(totalFaturado(ORDERS, 2026, null)).toBe(313);
    expect(totalCusto(ORDERS, 2026, 9)).toBe(140);
    expect(totalCusto(ORDERS, 2026, 8)).toBe(0);
  });

  it("agrupa por mês, por ordem cronológica", () => {
    expect(getBillingByMonth(ORDERS).map((m) => [m.monthKey, m.monthLabel, m.total, m.orderCount])).toEqual([
      ["2025-12", "Dezembro", 200, 1],
      ["2026-08", "Agosto", 50, 1],
      ["2026-09", "Setembro", 263, 2],
    ]);
    expect(getAvailableYears(ORDERS)).toEqual([2026, 2025]);
  });

  it("calcula a margem por mês", () => {
    const september = getProfitByMonth(ORDERS).find((m) => m.monthKey === "2026-09");
    expect(september).toMatchObject({ total: 263, cost: 140, margin: 123 });
  });

  it("ordersInPeriod usa o mesmo critério", () => {
    expect(ordersInPeriod(ORDERS, 2026, 9)).toHaveLength(2);
    expect(ordersInPeriod(ORDERS, 2026, null)).toHaveLength(3);
  });
});

describe("cobertura de custos", () => {
  it("mostra que parte das linhas com preço tem custo", () => {
    // 5 linhas com preço nas entregues + 1 na não entregue; com custo: 4 de 6
    expect(costCoverage(ORDERS)).toBeCloseTo(4 / 6);
  });

  it("ignora linhas a zero e devolve null sem linhas", () => {
    expect(costCoverage([order({ items: [item(1, 0)] })])).toBeNull();
    expect(costCoverage([])).toBeNull();
  });
});

describe("por cobrar", () => {
  it("soma as ordens entregues e não pagas, com a mais antiga", () => {
    const extra = order({ items: [item(1, 40)], paid: false, createdAt: "2026-07-01T12:00:00.000Z" });
    expect(outstanding([...ORDERS, extra])).toEqual({ total: 140, count: 2, oldest: "2026-07-01T12:00:00.000Z" });
  });

  it("não há nada por cobrar quando está tudo pago", () => {
    expect(outstanding([order({ items: [item(1, 10)] })])).toEqual({ total: 0, count: 0, oldest: null });
  });
});

describe("margem por ordem e por cliente", () => {
  it("dá a margem em euros e em percentagem", () => {
    const [first] = orderMargins([ORDERS[0]]);
    expect(first).toMatchObject({ total: 163, cost: 80, margin: 83 });
    expect(first.marginPct).toBeCloseTo(50.92, 2);
    expect(orderMargins([order({ items: [] })])[0].marginPct).toBeNull();
  });

  it("agrupa por cliente", () => {
    const byCustomer = Object.fromEntries(totalsByCustomer(ORDERS.slice(0, 4)).map((c) => [c.customerId, c]));
    expect(byCustomer["c-1"]).toMatchObject({ total: 213, cost: 80, margin: 133, orderCount: 2 });
    expect(byCustomer["c-2"]).toMatchObject({ total: 100, cost: 60, margin: 40, orderCount: 1 });
  });
});

describe("vendido abaixo do custo", () => {
  it("lista as linhas com preço abaixo do custo, a maior perda primeiro", () => {
    const orders = [
      order({ items: [{ description: "Pastilhas", quantity: 1, unitPrice: 49, unitCost: 52.92 }] }),
      order({ items: [{ description: "Discos", quantity: 2, unitPrice: 60, unitCost: 70 }, item(1, 35, null), item(1, 10, 10)] }),
    ];
    const rows = linesBelowCost(orders);
    expect(rows.map((r) => [r.description, r.loss])).toEqual([
      ["Discos", 20],
      ["Pastilhas", expect.closeTo(3.92, 2)],
    ]);
  });
});
