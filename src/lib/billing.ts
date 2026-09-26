import type { ServiceOrder } from "@/types";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function orderTotal(order: ServiceOrder): number {
  return order.items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  );
}

/** Custo das peças da ordem (linhas sem custo contam como zero). */
function orderCost(order: ServiceOrder): number {
  return order.items.reduce(
    (sum, i) => (i.unitCost == null ? sum : sum + i.quantity * i.unitCost),
    0
  );
}

function billableOrders(orders: ServiceOrder[]): ServiceOrder[] {
  return orders.filter((o) => o.status === "delivered");
}

export type MonthData = {
  monthKey: string;
  monthLabel: string;
  year: number;
  month: number;
  total: number;
  orderCount: number;
};

export function getBillingByMonth(orders: ServiceOrder[]): MonthData[] {
  const byKey: Record<string, { total: number; count: number; year: number; month: number }> = {};

  for (const order of billableOrders(orders)) {
    const date = new Date(order.createdAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const total = orderTotal(order);

    if (!byKey[key]) {
      byKey[key] = { total: 0, count: 0, year, month };
    }
    byKey[key].total += total;
    byKey[key].count += 1;
  }

  return Object.entries(byKey)
    .map(([monthKey, data]) => ({
      monthKey,
      monthLabel: MONTH_NAMES[data.month - 1],
      year: data.year,
      month: data.month,
      total: data.total,
      orderCount: data.count,
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export function getAvailableYears(orders: ServiceOrder[]): number[] {
  const years = new Set<number>();
  for (const order of billableOrders(orders)) {
    years.add(new Date(order.createdAt).getFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function filterByYear(data: MonthData[], year: number): MonthData[] {
  return data.filter((d) => d.year === year);
}

export function filterByMonth(data: MonthData[], year: number, month: number | null): MonthData[] {
  if (month === null) return data.filter((d) => d.year === year);
  return data.filter((d) => d.year === year && d.month === month);
}

export function totalFaturado(orders: ServiceOrder[], year?: number, month?: number | null): number {
  let sum = 0;
  for (const order of billableOrders(orders)) {
    const date = new Date(order.createdAt);
    if (year !== undefined && date.getFullYear() !== year) continue;
    if (month != null && date.getMonth() + 1 !== month) continue;
    sum += orderTotal(order);
  }
  return sum;
}

/** Custo das peças das ordens entregues no período (mesmo critério de totalFaturado). */
export function totalCusto(orders: ServiceOrder[], year?: number, month?: number | null): number {
  let sum = 0;
  for (const order of billableOrders(orders)) {
    const date = new Date(order.createdAt);
    if (year !== undefined && date.getFullYear() !== year) continue;
    if (month != null && date.getMonth() + 1 !== month) continue;
    sum += orderCost(order);
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Custo, margem e cobranças (página de Faturação modular)
// ---------------------------------------------------------------------------

/** Ordens entregues no período (ano e, opcionalmente, mês), pela data de criação. */
export function ordersInPeriod(
  orders: ServiceOrder[],
  year: number,
  month: number | null,
): ServiceOrder[] {
  return billableOrders(orders).filter((o) => {
    const date = new Date(o.createdAt);
    if (date.getFullYear() !== year) return false;
    return month === null || date.getMonth() + 1 === month;
  });
}

export function orderRevenue(order: ServiceOrder): number {
  return orderTotal(order);
}

export function orderCostTotal(order: ServiceOrder): number {
  return orderCost(order);
}

/**
 * Parte das linhas (com preço) que tem custo registado, de 0 a 1.
 * null quando não há linhas. Serve para avisar que a margem pode estar inflacionada.
 */
export function costCoverage(orders: ServiceOrder[]): number | null {
  let lines = 0;
  let withCost = 0;
  for (const order of orders) {
    for (const item of order.items) {
      if (item.unitPrice <= 0) continue;
      lines += 1;
      if (item.unitCost != null) withCost += 1;
    }
  }
  return lines === 0 ? null : withCost / lines;
}

export type OutstandingSummary = {
  total: number;
  count: number;
  /** Data de criação da ordem por cobrar mais antiga. */
  oldest: string | null;
};

/** Dinheiro por receber: ordens entregues e não pagas (todas, não só do período). */
export function outstanding(orders: ServiceOrder[]): OutstandingSummary {
  let total = 0;
  let count = 0;
  let oldest: string | null = null;
  for (const order of billableOrders(orders)) {
    if (order.paid) continue;
    total += orderTotal(order);
    count += 1;
    if (!oldest || order.createdAt < oldest) oldest = order.createdAt;
  }
  return { total, count, oldest };
}

export type ProfitMonth = {
  monthKey: string;
  monthLabel: string;
  year: number;
  month: number;
  total: number;
  cost: number;
  margin: number;
};

/** Faturado, custo e margem por mês (ordens entregues). */
export function getProfitByMonth(orders: ServiceOrder[]): ProfitMonth[] {
  const byKey: Record<string, ProfitMonth> = {};
  for (const order of billableOrders(orders)) {
    const date = new Date(order.createdAt);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const row =
      byKey[key] ??
      (byKey[key] = {
        monthKey: key,
        monthLabel: MONTH_NAMES[month - 1],
        year,
        month,
        total: 0,
        cost: 0,
        margin: 0,
      });
    const total = orderTotal(order);
    const cost = orderCost(order);
    row.total += total;
    row.cost += cost;
    row.margin += total - cost;
  }
  return Object.values(byKey).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export type OrderMarginRow = {
  order: ServiceOrder;
  total: number;
  cost: number;
  margin: number;
  /** Margem em % do faturado; null se a ordem não tem valor. */
  marginPct: number | null;
};

export function orderMargins(orders: ServiceOrder[]): OrderMarginRow[] {
  return orders.map((order) => {
    const total = orderTotal(order);
    const cost = orderCost(order);
    const margin = total - cost;
    return { order, total, cost, margin, marginPct: total > 0 ? (margin / total) * 100 : null };
  });
}

export type CustomerTotals = {
  customerId: string;
  total: number;
  cost: number;
  margin: number;
  orderCount: number;
};

export function totalsByCustomer(orders: ServiceOrder[]): CustomerTotals[] {
  const byId: Record<string, CustomerTotals> = {};
  for (const order of orders) {
    const row =
      byId[order.customerId] ??
      (byId[order.customerId] = {
        customerId: order.customerId,
        total: 0,
        cost: 0,
        margin: 0,
        orderCount: 0,
      });
    const total = orderTotal(order);
    const cost = orderCost(order);
    row.total += total;
    row.cost += cost;
    row.margin += total - cost;
    row.orderCount += 1;
  }
  return Object.values(byId);
}

export type BelowCostLine = {
  order: ServiceOrder;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  /** Perda na linha (positivo). */
  loss: number;
};

/** Linhas vendidas abaixo do custo (preço unitário < custo unitário). */
export function linesBelowCost(orders: ServiceOrder[]): BelowCostLine[] {
  const rows: BelowCostLine[] = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (item.unitCost == null || item.unitPrice >= item.unitCost) continue;
      rows.push({
        order,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        loss: (item.unitCost - item.unitPrice) * item.quantity,
      });
    }
  }
  return rows.sort((a, b) => b.loss - a.loss);
}
