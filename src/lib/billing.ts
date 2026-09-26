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
