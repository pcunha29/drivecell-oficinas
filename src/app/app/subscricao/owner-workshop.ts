import { createClient } from "@/lib/supabase/server";
import type { WorkshopRow } from "@/lib/supabase/database.types";

export type BillingWorkshop = Pick<
  WorkshopRow,
  | "id"
  | "name"
  | "subscription_status"
  | "trial_ends_at"
  | "current_period_end"
  | "stripe_customer_id"
  | "stripe_subscription_id"
  | "checkout_enabled"
  | "billing_interval"
  | "cancel_at_period_end"
  | "is_demo"
>;

const COLUMNS =
  "id, name, subscription_status, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id, checkout_enabled, billing_interval, cancel_at_period_end, is_demo";

/**
 * Utilizador e oficina dele, com o papel (a mesma oficina que a app usa: primeiro
 * aquela em que é dono, como current_workshop_id()). Lido com o cliente do utilizador,
 * por isso o RLS garante que só vê a sua oficina.
 */
export async function loadBillingContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, role: null, workshop: null } as const;

  const { data } = await supabase
    .from("workshop_members")
    .select(`role, workshops (${COLUMNS})`)
    .eq("user_id", user.id)
    .order("role", { ascending: false })
    .order("workshop_id")
    .limit(1)
    .maybeSingle();

  const row = data as { role: "owner" | "member"; workshops: BillingWorkshop | BillingWorkshop[] | null } | null;
  const embedded = row?.workshops ?? null;
  const workshop = Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
  return { user, role: workshop ? (row?.role ?? null) : null, workshop } as const;
}

/** O ecrã existe para esta oficina: o admin ligou-o, ou já há cliente na Stripe. */
export function canSeeBilling(workshop: BillingWorkshop): boolean {
  return workshop.checkout_enabled || Boolean(workshop.stripe_customer_id);
}
