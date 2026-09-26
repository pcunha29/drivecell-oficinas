"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { BelowCostLine } from "@/lib/billing";
import { formatEuro } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  rows: BelowCostLine[];
  customerName: (id: string) => string;
  plate: (id: string) => string;
};

const MAX_ROWS = 5;

/** Alerta: linhas vendidas abaixo do custo (erros de preço ou preço de fornecedor desatualizado). */
export function BelowCostCard({ rows, customerName, plate }: Props) {
  const totalLoss = rows.reduce((sum, r) => sum + r.loss, 0);
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {rows.length > 0 ? (
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          )}
          Vendido abaixo do custo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">
            Nenhuma linha vendida abaixo do custo neste período.
          </p>
        ) : (
          <>
            <p className="m-0 mb-3 text-sm text-muted-foreground">
              {rows.length} {rows.length === 1 ? "linha" : "linhas"} com preço abaixo do custo:{" "}
              <strong className="font-medium text-foreground">{formatEuro(totalLoss)}</strong> perdidos.
              Confirma se é engano ou se o preço do fornecedor mudou.
            </p>
            <ul className="m-0 divide-y divide-border rounded-md border border-border p-0">
              {rows.slice(0, MAX_ROWS).map((r, i) => (
                <li key={`${r.order.id}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{r.description || "Sem descrição"}</span>
                    <span className="text-muted-foreground">
                      {" "}· {customerName(r.order.customerId)} · {plate(r.order.vehicleId)}
                    </span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    vendido a {formatEuro(r.unitPrice)}, custou {formatEuro(r.unitCost)}
                  </span>
                </li>
              ))}
            </ul>
            {rows.length > MAX_ROWS && (
              <p className="m-0 mt-2 text-xs text-muted-foreground">
                E mais {rows.length - MAX_ROWS}.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
