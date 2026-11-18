"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Info, Loader2 } from "lucide-react";
import {
  openPortalAction,
  startCheckoutAction,
  type BillingActionState,
} from "@/app/app/subscricao/actions";
import type { BillingWorkshop } from "@/app/app/subscricao/owner-workshop";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageStack } from "@/lib/layout";
import { PRICE_LABEL, YEARLY_FREE_LABEL } from "@/lib/pricing";
import { hasLiveSubscription, type BillingInterval } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { formatDatePt, trialDaysLeft } from "@/lib/workshop";

type Props = {
  workshop: BillingWorkshop;
  /** Chave e preços da Stripe definidos neste ambiente. */
  configured: boolean;
  notice: "success" | "canceled" | null;
  /** Fim do teste, se ativar agora (a primeira cobrança fica para essa data). */
  firstChargeOn: string | null;
};

const initial: BillingActionState = {};

const PLAN_LABEL: Record<BillingInterval, string> = { month: "mensal", year: "anual" };

export function SubscriptionView({ workshop, configured, notice, firstChargeOn }: Props) {
  const live = hasLiveSubscription(workshop);

  return (
    <div className={pageStack}>
      <PageHeader title="Subscrição" description={workshop.name} />

      {notice === "success" && (
        <Notice tone="success" icon={CheckCircle2}>
          Obrigado! O pagamento ficou registado. Se pagaste por débito direto, a confirmação do banco
          pode demorar alguns dias, mas podes continuar a usar a app normalmente.
        </Notice>
      )}
      {notice === "canceled" && (
        <Notice tone="info" icon={Info}>
          O pagamento não foi concluído. Podes tentar de novo quando quiseres.
        </Notice>
      )}
      {!configured && (
        <Notice tone="warning" icon={AlertTriangle}>
          Os pagamentos ainda não estão disponíveis neste momento. Fala connosco e tratamos disso.
        </Notice>
      )}

      <StatusCard workshop={workshop} />

      {live ? (
        <ManageCard workshop={workshop} disabled={!configured} />
      ) : (
        <PlansCard workshop={workshop} disabled={!configured || workshop.is_demo} firstChargeOn={firstChargeOn} />
      )}
    </div>
  );
}

function StatusCard({ workshop }: { workshop: BillingWorkshop }) {
  const status = workshop.subscription_status;
  const plan = workshop.billing_interval ? ` · plano ${PLAN_LABEL[workshop.billing_interval]}` : "";
  const periodEnd = workshop.current_period_end ? formatDatePt(workshop.current_period_end) : null;

  let title: string;
  let text: string;
  let tone: "ok" | "warn" | "muted" = "muted";

  if (status === "active") {
    tone = "ok";
    title = `Subscrição ativa${plan}`;
    text = workshop.cancel_at_period_end
      ? `Pediste o cancelamento: a conta fica ativa até ${periodEnd ?? "ao fim do período pago"}.`
      : periodEnd
        ? `Próxima renovação a ${periodEnd}.`
        : "Está tudo em dia.";
  } else if (status === "past_due") {
    tone = "warn";
    title = "Pagamento por confirmar";
    text =
      "Se pagaste por débito direto, o banco pode demorar alguns dias a confirmar. Se o pagamento falhou, atualiza o cartão ou o IBAN em «Gerir subscrição». A app continua a funcionar entretanto.";
  } else if (status === "trialing") {
    const days = trialDaysLeft(workshop);
    if (days > 0) {
      title = "Período de experiência";
      text = `Termina a ${formatDatePt(workshop.trial_ends_at)} (${days === 1 ? "falta 1 dia" : `faltam ${days} dias`}).`;
    } else {
      tone = "warn";
      title = "O período de experiência terminou";
      text = "A conta está em só-leitura: consultas e exportas os dados, mas não crias nem alteras registos. Ativa a subscrição para continuar.";
    }
  } else {
    tone = "warn";
    title = "Subscrição cancelada";
    text = "A conta está em só-leitura. Os dados continuam disponíveis para consulta e exportação. Podes voltar a ativar quando quiseres.";
  }

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <span
          className={cn(
            "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
            tone === "ok" && "bg-emerald-500",
            tone === "warn" && "bg-amber-500",
            tone === "muted" && "bg-muted-foreground/50",
          )}
          aria-hidden
        />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlansCard({
  workshop,
  disabled,
  firstChargeOn,
}: {
  workshop: BillingWorkshop;
  disabled: boolean;
  firstChargeOn: string | null;
}) {
  const [state, formAction, pending] = useActionState(startCheckoutAction, initial);
  const [interval, setPlan] = useState<BillingInterval>(workshop.billing_interval ?? "month");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escolhe o plano</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <fieldset className="grid gap-3 sm:grid-cols-2" disabled={disabled || pending}>
            <legend className="sr-only">Plano</legend>
            <PlanOption
              value="month"
              checked={interval === "month"}
              onSelect={setPlan}
              title="Mensal"
              price={PRICE_LABEL.monthly}
              per="por mês"
              hint="Sem fidelização: cancelas quando quiseres."
            />
            <PlanOption
              value="year"
              checked={interval === "year"}
              onSelect={setPlan}
              title="Anual"
              price={PRICE_LABEL.yearly}
              per="por ano"
              hint={`Equivale a ${PRICE_LABEL.yearlyPerMonth} por mês: ${YEARLY_FREE_LABEL}.`}
              badge={YEARLY_FREE_LABEL}
            />
          </fieldset>

          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              {firstChargeOn
                ? `Só pagas a partir de ${formatDatePt(firstChargeOn)}, quando acaba a experiência.`
                : "A primeira cobrança é feita hoje."}
            </li>
            <li>Pagas com cartão ou por débito direto, com o IBAN da oficina.</li>
            <li>Podes indicar o NIF da oficina no pagamento. Preços com IVA incluído.</li>
          </ul>

          {state.error && (
            <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}

          {workshop.is_demo && (
            <p className="text-sm text-muted-foreground">Oficina de demonstração: sem pagamentos.</p>
          )}

          <Button type="submit" disabled={disabled || pending} className="w-full sm:w-auto sm:min-w-[260px]">
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <CreditCard aria-hidden />}
            {pending ? "A abrir o pagamento…" : "Continuar para o pagamento"}
          </Button>
          <p className="text-xs text-muted-foreground">
            O pagamento é feito na página segura da Stripe. Voltas aqui no fim.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function PlanOption({
  value,
  checked,
  onSelect,
  title,
  price,
  per,
  hint,
  badge,
}: {
  value: BillingInterval;
  checked: boolean;
  onSelect: (value: BillingInterval) => void;
  title: string;
  price: string;
  per: string;
  hint: string;
  badge?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50",
      )}
    >
      <input
        type="radio"
        name="interval"
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">{title}</span>
        {badge && (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            {badge}
          </span>
        )}
      </span>
      <span className="text-2xl font-bold text-foreground">
        {price} <span className="text-sm font-normal text-muted-foreground">{per}</span>
      </span>
      <span className="text-sm text-muted-foreground">{hint}</span>
    </label>
  );
}

function ManageCard({ workshop, disabled }: { workshop: BillingWorkshop; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(openPortalAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerir subscrição</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Muda o cartão ou o IBAN, vê e descarrega os recibos, muda de plano ou cancela
            {workshop.cancel_at_period_end ? " (ou retoma a subscrição)" : ""}.
          </p>
          {state.error && (
            <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}
          <Button type="submit" variant="outline" disabled={disabled || pending} className="w-full sm:w-auto">
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <CreditCard aria-hidden />}
            {pending ? "A abrir…" : "Gerir subscrição"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Notice({
  tone,
  icon: Icon,
  children,
}: {
  tone: "success" | "info" | "warning";
  icon: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
        tone === "success" && "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
        tone === "info" && "border-border bg-muted/60 text-foreground",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
