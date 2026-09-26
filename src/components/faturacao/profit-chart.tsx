"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProfitMonth } from "@/lib/billing";
import { formatEuro } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SERIES = [
  { key: "margin", label: "Margem", color: "var(--chart-margin)" },
  { key: "cost", label: "Custo", color: "var(--chart-cost)" },
] as const;

function ProfitTooltip({ active, payload }: { active?: boolean; payload?: { payload: ProfitMonth }[] }) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  const pct = d.total > 0 ? (d.margin / d.total) * 100 : null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="m-0 mb-1 font-medium text-card-foreground">
        {d.monthLabel} {d.year}
      </p>
      <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 tabular-nums">
        <dt className="text-muted-foreground">Faturado</dt>
        <dd className="m-0 text-right text-card-foreground">{formatEuro(d.total)}</dd>
        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: "var(--chart-cost)" }} />
          Custo
        </dt>
        <dd className="m-0 text-right text-card-foreground">{formatEuro(d.cost)}</dd>
        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: "var(--chart-margin)" }} />
          Margem
        </dt>
        <dd className="m-0 text-right font-medium text-card-foreground">
          {formatEuro(d.margin)}
          {pct !== null && (
            <span className="ml-1 font-normal text-muted-foreground">
              ({pct.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}%)
            </span>
          )}
        </dd>
      </dl>
    </div>
  );
}

/** Lucro por mês: barras empilhadas custo + margem (a altura total é o faturado). */
export function ProfitChart({ data, emptyMessage }: { data: ProfitMonth[]; emptyMessage: string }) {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Lucro por mês</CardTitle>
        <ul className="m-0 flex list-none gap-4 p-0 text-xs text-muted-foreground" aria-label="Legenda">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div
            className="h-[280px] w-full"
            role="img"
            aria-label={`Lucro por mês: ${data
              .map((d) => `${d.monthLabel}, margem ${formatEuro(d.margin)} de ${formatEuro(d.total)} faturados`)
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
                  tickFormatter={(v) => `${v} €`}
                  width={56}
                />
                <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ProfitTooltip />} />
                {/* Custo em baixo (âncora na linha de base), margem por cima; 2px de separação. */}
                <Bar dataKey="cost" stackId="lucro" fill="var(--chart-cost)" stroke="var(--card)" strokeWidth={2} maxBarSize={48} radius={[0, 0, 4, 4]} />
                <Bar dataKey="margin" stackId="lucro" fill="var(--chart-margin)" stroke="var(--card)" strokeWidth={2} maxBarSize={48} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
