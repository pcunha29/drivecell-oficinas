"use client";

import { useMemo, useState } from "react";
import type { OrderMarginRow } from "@/lib/billing";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

type SortKey = "pior" | "melhor" | "recentes";

type Props = {
  rows: OrderMarginRow[];
  customerName: (id: string) => string;
  plate: (id: string) => string;
};

const PAGE = 8;
/** Abaixo disto a margem aparece destacada. */
const LOW_MARGIN_PCT = 20;

const dateFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
});

function pct(value: number | null) {
  return value === null
    ? "-"
    : `${value.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}%`;
}

/** Margem por ordem entregue: mostra que trabalhos renderam pouco. */
export function OrderMarginTable({ rows, customerName, plate }: Props) {
  const [sort, setSort] = useState<SortKey>("pior");
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sort === "recentes")
      copy.sort((a, b) => b.order.createdAt.localeCompare(a.order.createdAt));
    else {
      const dir = sort === "pior" ? 1 : -1;
      copy.sort(
        (a, b) => dir * ((a.marginPct ?? Infinity) - (b.marginPct ?? Infinity)),
      );
    }
    return copy;
  }, [rows, sort]);

  const visible = showAll ? sorted : sorted.slice(0, PAGE);

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="text-base">Margem por ordem</CardTitle>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Ordenar</span>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 min-h-0 w-auto text-sm"
            aria-label="Ordenar ordens"
          >
            <option value="pior">Menor margem primeiro</option>
            <option value="melhor">Maior margem primeiro</option>
            <option value="recentes">Mais recentes</option>
          </Select>
        </label>
      </CardHeader>
      <CardContent className="px-0 pb-2 sm:px-6">
        {rows.length === 0 ? (
          <p className="m-0 px-6 pb-4 text-sm text-muted-foreground sm:px-0">
            Sem ordens entregues neste período.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm sm:min-w-[520px]">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-6 py-2 font-medium sm:pl-0">
                      Ordem
                    </th>
                    <th
                      scope="col"
                      className="px-2 py-2 text-right font-medium"
                    >
                      Faturado
                    </th>
                    <th
                      scope="col"
                      className="hidden px-2 py-2 text-right font-medium sm:table-cell"
                    >
                      Custo
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-2 text-right font-medium sm:pr-0"
                    >
                      Margem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const low =
                      r.marginPct !== null && r.marginPct < LOW_MARGIN_PCT;
                    return (
                      <tr
                        key={r.order.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-6 py-2.5 sm:pl-0">
                          <div className="font-medium">
                            {customerName(r.order.customerId)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dateFmt.format(new Date(r.order.createdAt))} ·{" "}
                            {plate(r.order.vehicleId)} · {r.order.description}
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums">
                          {formatEuro(r.total)}
                        </td>
                        <td className="hidden px-2 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                          {formatEuro(r.cost)}
                        </td>
                        <td className="px-6 py-2.5 text-right tabular-nums sm:pr-0">
                          <div
                            className={cn(
                              "font-medium",
                              r.margin < 0 && "text-red-600 dark:text-red-400",
                            )}
                          >
                            {formatEuro(r.margin)}
                          </div>
                          <div
                            className={cn(
                              "text-xs",
                              low
                                ? "font-medium text-amber-700 dark:text-amber-400"
                                : "text-muted-foreground",
                            )}
                          >
                            {pct(r.marginPct)}
                            {low && (
                              <span className="sr-only"> (margem baixa)</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sorted.length > PAGE && (
              <div className="px-6 pt-2 sm:px-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll
                    ? "Mostrar menos"
                    : `Mostrar todas (${sorted.length})`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
