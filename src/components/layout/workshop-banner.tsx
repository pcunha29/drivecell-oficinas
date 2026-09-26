"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { mailtoUrl, whatsappUrl } from "@/lib/contact";
import { pageContainer } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { formatDatePt, trialDaysLeft } from "@/lib/workshop";
import { useWorkshop } from "@/stores/workshop-store";

const TRIAL_WARNING_DAYS = 7;

/** Aviso no topo da app: fim do teste próximo, ou conta em só-leitura. */
export function WorkshopBanner() {
  const { workshop, canWrite } = useWorkshop();
  if (!workshop) return null;

  if (!canWrite) {
    return (
      <div
        role="status"
        className="border-b border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <div
          className={cn(
            pageContainer,
            "flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Conta em só-leitura. Contacta-nos para reativar.</span>
          </p>
          <div className="flex shrink-0 items-center gap-4 pl-6 font-medium sm:pl-0">
            <a
              href={mailtoUrl(`Reativar conta — ${workshop.name}`)}
              className="underline underline-offset-4 hover:no-underline"
            >
              Email
            </a>
            <a
              href={whatsappUrl(`Olá! Quero reativar a conta da oficina ${workshop.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:no-underline"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (
    workshop.subscription_status === "trialing" &&
    trialDaysLeft(workshop) <= TRIAL_WARNING_DAYS
  ) {
    return (
      <div
        role="status"
        className="border-b border-border bg-muted/60 text-foreground"
      >
        <p
          className={cn(
            pageContainer,
            "flex items-center gap-2 py-2.5 text-sm",
          )}
        >
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          O teu período de teste termina a {formatDatePt(workshop.trial_ends_at)}.
        </p>
      </div>
    );
  }

  return null;
}
