"use client";

import { useOrderStore } from "@/stores/order-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Car, Clock, Loader2, CheckCircle, Truck } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { STALE_AFTER_DAYS, carsInWorkshop } from "@/lib/stay";
import { cn } from "@/lib/utils";

const STATS = [
  { status: "waiting" as const, label: "Em espera", icon: Clock },
  { status: "in_progress" as const, label: "Em curso", icon: Loader2 },
  { status: "done" as const, label: "Concluída", icon: CheckCircle },
  { status: "delivered" as const, label: "Entregue", icon: Truck },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

export function DashboardStats() {
  const orders = useOrderStore((s) => s.orders);
  const pricesVisible = usePreferencesStore((s) => s.pricesVisible);

  const getOrdersByStatus = (status: (typeof STATS)[number]["status"]) =>
    orders.filter((o) => o.status === status);

  // Momento em que o quadro abriu; fixo para o render ser puro.
  const [now] = useState(() => new Date());
  const inWorkshop = carsInWorkshop(orders, now);

  const totalValue = orders.reduce((sum, o) => {
    return sum + o.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  }, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">
          {getGreeting()},
        </h2>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Isto é o que precisa da tua atenção hoje.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
        {STATS.map(({ status, label, icon: Icon }) => {
          const count = getOrdersByStatus(status).length;
          return (
            <Card key={status} className="border-border shadow-sm">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground md:text-sm">
                    {label}
                  </p>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground md:text-3xl">
                  {count}
                </p>
              </CardContent>
            </Card>
          );
        })}
        <Card className="col-span-1 border-border shadow-sm md:col-span-2 lg:col-span-1">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground md:text-sm">
                Na oficina agora
              </p>
              <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground md:text-3xl">
              {inWorkshop.count}
            </p>
            <p
              className={cn(
                "mt-1 text-xs",
                inWorkshop.stale > 0
                  ? "font-medium text-amber-700 dark:text-amber-400"
                  : "text-muted-foreground",
              )}
            >
              {inWorkshop.stale > 0
                ? `${inWorkshop.stale} há ${STALE_AFTER_DAYS} dias ou mais`
                : inWorkshop.oldest
                  ? inWorkshop.oldest.days === 0
                    ? "Todos entraram hoje"
                    : `O mais antigo está cá há ${inWorkshop.oldest.days} ${inWorkshop.oldest.days === 1 ? "dia" : "dias"}`
                  : "Nenhum carro cá dentro"}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-1 border-border shadow-sm md:col-span-2 lg:col-span-1">
          <CardContent className="p-4 md:p-5">
            <p className="text-xs font-medium text-muted-foreground md:text-sm">
              Valor total (ordens)
            </p>
            <p className="mt-2 font-bold tabular-nums text-foreground leading-tight text-[clamp(1rem,4.5vw,1.875rem)]">
              {pricesVisible ? formatEuro(totalValue) : "••••"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
