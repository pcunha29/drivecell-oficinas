import type { SubscriptionStatusDb } from "@/lib/supabase/database.types";

/**
 * Lógica pura da subscrição Stripe (sem rede): converte o que a Stripe devolve
 * nos campos da tabela workshops. Testado em tests/unit/pagamentos.test.ts.
 */

export type BillingInterval = "month" | "year";

/** O mínimo de uma subscrição Stripe que precisamos (compatível com Stripe.Subscription). */
export type StripeSubscriptionLike = {
  id: string;
  status: string;
  customer: string | { id: string };
  cancel_at_period_end: boolean;
  trial_end: number | null;
  metadata?: Record<string, string> | null;
  items: {
    data: Array<{
      current_period_end?: number | null;
      price?: { recurring?: { interval?: string | null } | null } | null;
    }>;
  };
  /** Versões antigas da API tinham o período na própria subscrição. */
  current_period_end?: number | null;
};

/**
 * Estado da Stripe → estado da app (que decide se a conta escreve, ver can_write):
 * - active / trialing → active (pagou, ou tem a subscrição criada e o teste ainda a correr)
 * - past_due / unpaid / incomplete → past_due (pagamento por confirmar ou falhado: a app
 *   continua a escrever e avisa; o débito direto demora alguns dias a confirmar)
 * - canceled / incomplete_expired / paused / desconhecido → canceled (só-leitura)
 */
export function mapStripeStatus(status: string): SubscriptionStatusDb {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    default:
      return "canceled";
  }
}

/** Fim do período pago (o maior dos itens), ou o fim do teste na Stripe; ISO ou null. */
export function subscriptionPeriodEnd(sub: StripeSubscriptionLike): string | null {
  const ends = sub.items.data
    .map((item) => item.current_period_end ?? 0)
    .filter((n) => n > 0);
  const seconds =
    (ends.length > 0 ? Math.max(...ends) : 0) || sub.current_period_end || sub.trial_end || 0;
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

export function subscriptionInterval(sub: StripeSubscriptionLike): BillingInterval | null {
  const interval = sub.items.data[0]?.price?.recurring?.interval;
  return interval === "month" || interval === "year" ? interval : null;
}

export function stripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** Campos da tabela workshops a gravar a partir de uma subscrição. */
export function workshopUpdateFromSubscription(sub: StripeSubscriptionLike) {
  return {
    subscription_status: mapStripeStatus(sub.status),
    stripe_subscription_id: sub.id,
    stripe_customer_id: stripeId(sub.customer),
    current_period_end: subscriptionPeriodEnd(sub),
    billing_interval: subscriptionInterval(sub),
    cancel_at_period_end: sub.cancel_at_period_end,
  };
}

/** A Stripe só aceita trial_end com pelo menos 48 h; damos 1 h de margem. */
const MIN_TRIAL_SECONDS = 49 * 3600;

/**
 * Quem ativa a meio do teste não perde os dias que faltam: a primeira cobrança fica
 * para o fim do teste (trial_end na Stripe). Devolve segundos Unix, ou null se o teste
 * já acabou ou acaba em menos de ~2 dias (aí cobra logo).
 */
export function checkoutTrialEnd(
  workshop: { subscription_status: SubscriptionStatusDb; trial_ends_at: string },
  now: Date = new Date(),
): number | null {
  if (workshop.subscription_status !== "trialing") return null;
  const end = Math.floor(new Date(workshop.trial_ends_at).getTime() / 1000);
  const nowSeconds = Math.floor(now.getTime() / 1000);
  return end - nowSeconds >= MIN_TRIAL_SECONDS ? end : null;
}

/** Já tem uma subscrição em curso na Stripe (não abrir outro checkout: vai ao portal). */
export function hasLiveSubscription(workshop: {
  subscription_status: SubscriptionStatusDb;
  stripe_subscription_id: string | null;
}): boolean {
  return (
    workshop.stripe_subscription_id != null &&
    (workshop.subscription_status === "active" || workshop.subscription_status === "past_due")
  );
}
