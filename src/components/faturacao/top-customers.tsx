"use client";

import { useMemo, useState } from "react";
import type { CustomerTotals } from "@/lib/billing";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Metric = "total" | "margin";

type Props = {
  rows: CustomerTotals[];
  customerName: (id: string) => string;
  /** Com custos ligados pode ordenar por margem. */
  trackCosts: boolean;
};

const TOP = 5;

/** Melhores clientes por faturado ou por margem (o que mais fatura pode não ser o que mais rende). */
export function TopCustomers({ rows, customerName, trackCosts }: Props) {
  const [metricState, setMetric] = useState<Metric>("total");
  const metric: Metric = trackCosts ? metricState : "total";

  const top = useMemo(
    () => [...rows].sort((a, b) => b[metric] - a[metric]).slice(0, TOP),
    [rows, metric],
  );
  const max = Math.max(1, ...top.map((r) => Math.max(0, r[metric])));

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="text-base">Melhores clientes</CardTitle>
        {trackCosts && (
          <div role="group" aria-label="Ordenar por" className="inline-flex rounded-md border border-border p-0.5 text-sm">
            {(
              [
                ["total", "Faturado"],
                ["margin", "Margem"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={metric === value}
                onClick={() => setMetric(value)}
                className={cn(
                  "min-h-9 cursor-pointer rounded-[5px] px-3 transition-colors",
                  metric === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">Sem ordens entregues neste período.</p>
        ) : (
          <ol className="m-0 space-y-3 p-0">
            {top.map((r) => {
              const value = r[metric];
              const pctOfTotal = r.total > 0 ? (r.margin / r.total) * 100 : null;
              return (
                <li key={r.customerId} className="list-none">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{customerName(r.customerId)}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatEuro(value)}
                      {metric === "margin" && pctOfTotal !== null && (
                        <span className="ml-1 text-muted-foreground">
                          ({pctOfTotal.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(Math.max(0, value) / max) * 100}%`,
                          background: metric === "margin" ? "var(--chart-margin)" : "var(--chart-revenue)",
                        }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                      {r.orderCount} {r.orderCount === 1 ? "ordem" : "ordens"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
