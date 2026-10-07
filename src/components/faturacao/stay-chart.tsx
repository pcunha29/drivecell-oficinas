"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDays, type StayMonth, type StaySummary } from "@/lib/stay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StayTooltip({ active, payload }: { active?: boolean; payload?: { payload: StayMonth }[] }) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="m-0 mb-1 font-medium text-card-foreground">
        {d.monthLabel} {d.year}
      </p>
      <p className="m-0 tabular-nums text-card-foreground">
        {formatDays(d.average)} em média
      </p>
      <p className="m-0 text-xs text-muted-foreground">
        {d.count} {d.count === 1 ? "viatura entregue" : "viaturas entregues"}
      </p>
    </div>
  );
}

/** Tempo médio entre a entrada e a saída das viaturas, por mês de entrega. */
export function StayChart({
  data,
  summary,
  periodLabel,
  emptyMessage,
  describeOrder,
}: {
  data: StayMonth[];
  summary: StaySummary;
  periodLabel: string;
  emptyMessage: string;
  /** "AA-12-BC · Roberto Mendes" para a estadia mais longa. */
  describeOrder: (order: NonNullable<StaySummary["longest"]>["order"]) => string;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-x-4 gap-y-2 space-y-0">
        <div className="grid gap-1">
          <CardTitle className="text-base">Tempo na oficina</CardTitle>
          <p className="m-0 text-xs text-muted-foreground">Da entrada à entrega · {periodLabel}</p>
        </div>
        {summary.average !== null && (
          <div className="text-right">
            <p className="m-0 text-2xl font-bold tabular-nums text-foreground">{formatDays(summary.average)}</p>
            <p className="m-0 text-xs text-muted-foreground">
              em média · {summary.count} {summary.count === 1 ? "entregue" : "entregues"}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div
            className="h-[240px] w-full"
            role="img"
            aria-label={`Tempo médio na oficina por mês: ${data
              .map((d) => `${d.monthLabel}, ${formatDays(d.average)}`)
              .join("; ")}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickFormatter={(v) => `${v} d`}
                  width={44}
                />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<StayTooltip />} />
                <Bar dataKey="average" fill="var(--chart-revenue)" maxBarSize={48} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {(summary.longest || summary.missingEntry > 0) && (
          <div className="space-y-1 text-xs text-muted-foreground">
            {summary.longest && (
              <p className="m-0">
                Mais longa: <span className="font-medium text-foreground">{formatDays(summary.longest.days)}</span> ·{" "}
                {describeOrder(summary.longest.order)}
              </p>
            )}
            {summary.missingEntry > 0 && (
              <p className="m-0">
                {summary.missingEntry === 1
                  ? "1 viatura entregue sem data de entrada não conta para a média."
                  : `${summary.missingEntry} viaturas entregues sem data de entrada não contam para a média.`}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
