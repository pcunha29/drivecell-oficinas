import type {
  SubscriptionStatusDb,
  WorkshopRow,
} from "@/lib/supabase/database.types";

/** Oficina do utilizador, como a app a usa. */
export type Workshop = Pick<
  WorkshopRow,
  | "id"
  | "name"
  | "subscription_status"
  | "trial_ends_at"
  | "current_period_end"
  | "is_demo"
>;

export const WORKSHOP_SELECT =
  "id, name, subscription_status, trial_ends_at, current_period_end, is_demo";

const WRITABLE_STATUSES: SubscriptionStatusDb[] = ["active", "past_due"];

/**
 * Espelha a função SQL `can_write`: pode escrever com subscrição ativa,
 * pagamento em atraso, ou teste ainda a decorrer.
 */
export function workshopCanWrite(
  workshop: Pick<Workshop, "subscription_status" | "trial_ends_at">,
  now: Date = new Date(),
): boolean {
  if (WRITABLE_STATUSES.includes(workshop.subscription_status)) return true;
  return (
    workshop.subscription_status === "trialing" &&
    new Date(workshop.trial_ends_at).getTime() > now.getTime()
  );
}

/** Dias (arredondados para cima) até ao fim do teste; negativo se já acabou. */
export function trialDaysLeft(
  workshop: Pick<Workshop, "trial_ends_at">,
  now: Date = new Date(),
): number {
  const ms = new Date(workshop.trial_ends_at).getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function formatDatePt(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
