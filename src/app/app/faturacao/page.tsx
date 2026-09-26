"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useOrderStore } from "@/stores/order-store";
import { useCustomerStore } from "@/stores/customer-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { useTrackCosts } from "@/stores/workshop-store";
import {
  costCoverage,
  filterByYear,
  getAvailableYears,
  getBillingByMonth,
  getProfitByMonth,
  linesBelowCost,
  orderMargins,
  ordersInPeriod,
  outstanding,
  totalsByCustomer,
} from "@/lib/billing";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { pageStack } from "@/lib/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { BillingBarChart } from "@/components/faturacao/billing-bar-chart";
import { BillingLineChart } from "@/components/faturacao/billing-line-chart";
import { ProfitChart } from "@/components/faturacao/profit-chart";
import { OrderMarginTable } from "@/components/faturacao/order-margin-table";
import { TopCustomers } from "@/components/faturacao/top-customers";
import { BelowCostCard } from "@/components/faturacao/below-cost-card";
import { BlockPicker } from "@/components/faturacao/block-picker";
import { BILLING_BLOCKS, useBillingBlocks, type BillingBlockId } from "@/components/faturacao/blocks";

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

/** Abaixo desta cobertura de custos a margem aparece com aviso (pode estar inflacionada). */
const LOW_COVERAGE = 0.7;

function pctLabel(value: number, digits = 0) {
  return `${value.toLocaleString("pt-PT", { maximumFractionDigits: digits })}%`;
}

function StatCard({
  title,
  value,
  note,
  valueClassName,
}: {
  title: string;
  value: string;
  note?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground md:text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("m-0 text-3xl font-bold tabular-nums text-foreground", valueClassName)}>{value}</p>
        {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
      </CardContent>
    </Card>
  );
}

export default function FaturacaoPage() {
  const orders = useOrderStore((s) => s.orders);
  const getCustomer = useCustomerStore((s) => s.getCustomerById);
  const getVehicle = useVehicleStore((s) => s.getVehicleById);
  const trackCosts = useTrackCosts();
  const { isVisible, setVisible, reset } = useBillingBlocks();

  const years = useMemo(() => {
    const available = getAvailableYears(orders);
    return available.length > 0 ? available : [new Date().getFullYear()];
  }, [orders]);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  // Momento em que a página abriu (para "há X dias"); fixo para o render ser puro.
  const [now] = useState(() => Date.now());
  const activeYear = selectedYear ?? String(years[0]);
  const yearNum = parseInt(activeYear, 10);
  const monthNum = selectedMonth ? parseInt(selectedMonth, 10) : null;
  const periodLabel = selectedMonth
    ? `${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label} ${activeYear}`
    : activeYear;
  const emptyMessage = selectedMonth
    ? "Sem ordens entregues no período selecionado."
    : "Sem ordens entregues com faturação.";

  const data = useMemo(() => {
    const periodOrders = ordersInPeriod(orders, yearNum, monthNum);
    const margins = orderMargins(periodOrders);
    const total = margins.reduce((s, r) => s + r.total, 0);
    const cost = margins.reduce((s, r) => s + r.cost, 0);

    const monthly = filterByYear(getBillingByMonth(orders), yearNum);
    const profit = getProfitByMonth(orders).filter((d) => d.year === yearNum);

    return {
      margins,
      total,
      cost,
      margin: total - cost,
      coverage: costCoverage(periodOrders),
      chartData: monthNum ? monthly.filter((d) => d.month === monthNum) : monthly,
      profitData: monthNum ? profit.filter((d) => d.month === monthNum) : profit,
      customers: totalsByCustomer(periodOrders),
      belowCost: linesBelowCost(periodOrders),
      owed: outstanding(orders),
    };
  }, [orders, yearNum, monthNum]);

  const customerName = useCallback(
    (id: string) => getCustomer(id)?.name ?? "Cliente removido",
    [getCustomer],
  );
  const plate = useCallback((id: string) => getVehicle(id)?.plate ?? "—", [getVehicle]);

  const availableBlocks = BILLING_BLOCKS.filter((b) => trackCosts || !b.needsCosts);
  const show = (id: BillingBlockId) => availableBlocks.some((b) => b.id === id) && isVisible(id);

  const marginPct = data.total > 0 ? (data.margin / data.total) * 100 : null;
  const lowCoverage = data.coverage !== null && data.coverage < LOW_COVERAGE;
  const owedDays = data.owed.oldest
    ? Math.floor((now - new Date(data.owed.oldest).getTime()) / 86_400_000)
    : null;

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
      <div className="col-span-2 sm:col-span-1">
        <BlockPicker blocks={availableBlocks} isVisible={isVisible} setVisible={setVisible} reset={reset} />
      </div>
    </div>
  );

  const cards: React.ReactNode[] = [];
  if (show("resumo")) {
    cards.push(<StatCard key="faturado" title={`Total faturado · ${periodLabel}`} value={formatEuro(data.total)} />);
    if (trackCosts) {
      cards.push(
        <StatCard
          key="custo"
          title="Custo"
          value={formatEuro(data.cost)}
          note="Peças e mão de obra com custo registado."
        />,
        <StatCard
          key="margem"
          title="Margem bruta"
          value={formatEuro(data.margin)}
          valueClassName={data.margin < 0 ? "text-red-600 dark:text-red-400" : undefined}
          note={
            <>
              {marginPct === null ? "Sem faturação no período." : `${pctLabel(marginPct, 1)} do faturado`}
              {data.coverage !== null && (
                <span
                  className={cn(
                    "mt-1 flex items-start gap-1",
                    lowCoverage && "font-medium text-amber-700 dark:text-amber-400",
                  )}
                >
                  {lowCoverage && <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />}
                  {lowCoverage
                    ? `Só ${pctLabel(data.coverage * 100)} das linhas têm custo: a margem real deve ser mais baixa.`
                    : `Custo registado em ${pctLabel(data.coverage * 100)} das linhas.`}
                </span>
              )}
            </>
          }
        />,
      );
    }
  }
  if (show("por-cobrar")) {
    cards.push(
      <StatCard
        key="por-cobrar"
        title="Por cobrar"
        value={formatEuro(data.owed.total)}
        valueClassName={data.owed.total > 0 ? "text-amber-700 dark:text-amber-400" : undefined}
        note={
          data.owed.count === 0
            ? "Todas as ordens entregues estão pagas."
            : `${data.owed.count} ${data.owed.count === 1 ? "ordem entregue" : "ordens entregues"} por pagar${
                owedDays !== null && owedDays > 0 ? ` · a mais antiga há ${owedDays} dias` : ""
              }. Conta todas as datas.`
        }
      />,
    );
  }

  const charts = [
    show("lucro-mes") && <ProfitChart key="lucro" data={data.profitData} emptyMessage={emptyMessage} />,
    show("faturado-mes") && <BillingBarChart key="barras" data={data.chartData} emptyMessage={emptyMessage} />,
    show("evolucao") && <BillingLineChart key="linha" data={data.chartData} emptyMessage={emptyMessage} />,
  ].filter(Boolean);

  const tables = [
    show("margem-ordem") && (
      <OrderMarginTable key="margens" rows={data.margins} customerName={customerName} plate={plate} />
    ),
    show("top-clientes") && (
      <TopCustomers key="clientes" rows={data.customers} customerName={customerName} trackCosts={trackCosts} />
    ),
  ].filter(Boolean);

  const nothingVisible =
    cards.length === 0 && charts.length === 0 && tables.length === 0 && !show("abaixo-custo");

  return (
    <div className={pageStack}>
      <PageHeader
        title="Faturação"
        description="Receita por período (ordens entregues)"
        actions={filters}
      />

      {cards.length > 0 && (
        <div className={cn("grid gap-4 sm:grid-cols-2", cards.length >= 3 && "xl:grid-cols-4", cards.length === 3 && "xl:grid-cols-3")}>
          {cards}
        </div>
      )}

      {show("abaixo-custo") && (data.belowCost.length > 0 || cards.length === 0) && (
        <BelowCostCard rows={data.belowCost} customerName={customerName} plate={plate} />
      )}

      {charts.length > 0 && (
        <div className={cn("grid grid-cols-1 gap-6 [&>*]:min-w-0", charts.length > 1 && "lg:grid-cols-2")}>{charts}</div>
      )}

      {tables.length > 0 && (
        <div className={cn("grid grid-cols-1 items-start gap-6 [&>*]:min-w-0", tables.length > 1 && "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")}>
          {tables}
        </div>
      )}

      {show("abaixo-custo") && data.belowCost.length === 0 && cards.length > 0 && (
        <BelowCostCard rows={data.belowCost} customerName={customerName} plate={plate} />
      )}

      {nothingVisible && (
        <Card className="border-dashed border-border">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Todos os blocos estão escondidos. Usa «Personalizar» para escolher o que ver.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
