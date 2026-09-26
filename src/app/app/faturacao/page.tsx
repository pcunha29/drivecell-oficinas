"use client";

import { useMemo, useState } from "react";
import { useOrderStore } from "@/stores/order-store";
import {
  getBillingByMonth,
  getAvailableYears,
  filterByYear,
  totalFaturado,
} from "@/lib/billing";
import { formatEuro } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BillingBarChart } from "@/components/faturacao/billing-bar-chart";
import { BillingLineChart } from "@/components/faturacao/billing-line-chart";
import { PageHeader } from "@/components/layout/page-header";
import { pageStack } from "@/lib/layout";

const MONTH_OPTIONS = [
  { value: "", label: "Todos os meses" },
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export default function FaturacaoPage() {
  const orders = useOrderStore((s) => s.orders);
  const years = useMemo(() => {
    const available = getAvailableYears(orders);
    return available.length > 0 ? available : [new Date().getFullYear()];
  }, [orders]);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const activeYear = selectedYear ?? String(years[0]);

  const { chartData, totalPeriod } = useMemo(() => {
    const allMonthly = getBillingByMonth(orders);
    const yearNum = parseInt(activeYear, 10);
    const monthNum = selectedMonth ? parseInt(selectedMonth, 10) : null;

    const forYear = filterByYear(allMonthly, yearNum);
    const chartData = monthNum
      ? forYear.filter((d) => d.month === monthNum)
      : forYear;

    const totalPeriod = totalFaturado(orders, yearNum, monthNum);

    return { chartData, totalPeriod };
  }, [orders, activeYear, selectedMonth]);

  const filters = (
    <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-end sm:gap-4">
      <div className="grid gap-2">
        <Label htmlFor="year">Ano</Label>
        <Select
          id="year"
          value={activeYear}
          onChange={(e) => {
            setSelectedYear(e.target.value);
            setSelectedMonth("");
          }}
          className="min-h-[44px] w-full text-base"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="month">Mês</Label>
        <Select
          id="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="min-h-[44px] w-full text-base"
        >
          {MONTH_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );

  return (
    <div className={pageStack}>
      <PageHeader
        title="Faturação"
        description="Receita por período (ordens entregues)"
        actions={filters}
      />

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground md:text-base">
            Total faturado
            {selectedMonth
              ? ` - ${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label} ${activeYear}`
              : ` - ${activeYear}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums text-foreground md:text-4xl">
            {formatEuro(totalPeriod)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <BillingBarChart
          data={chartData}
          emptyMessage={
            selectedMonth
              ? "Sem ordens entregues no período selecionado."
              : "Sem ordens entregues com faturação."
          }
        />
        <BillingLineChart
          data={chartData}
          emptyMessage={
            selectedMonth
              ? "Sem ordens entregues no período selecionado."
              : "Sem ordens entregues com faturação."
          }
        />
      </div>
    </div>
  );
}
