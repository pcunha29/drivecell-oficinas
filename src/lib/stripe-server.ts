import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdminEvent } from "@/lib/admin/audit";
import {
  stripeId,
  workshopUpdateFromSubscription,
  type BillingInterval,
} from "@/lib/subscription";

/**
 * Stripe no servidor (server actions e o webhook). Nunca importar em componentes cliente.
 *
 * Variáveis de ambiente (ver docs/pagamentos-stripe.md):
 *   STRIPE_SECRET_KEY        sk_test_… / sk_live_…
 *   STRIPE_WEBHOOK_SECRET    whsec_… (do endpoint no painel, ou do `stripe listen`)
 *   STRIPE_PRICE_MONTHLY     price_… do plano mensal (39 €)
 *   STRIPE_PRICE_YEARLY      price_… do plano anual (349 €)
 */

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (typeof window !== "undefined") throw new Error("A Stripe só pode ser usada no servidor.");
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY (Stripe → Developers → API keys).");
  client ??= new Stripe(key, { appInfo: { name: "DriveCell Oficinas" } });
  return client;
}

/** Os pagamentos na app estão configurados neste ambiente (chave e os dois preços). */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_MONTHLY?.trim() &&
      process.env.STRIPE_PRICE_YEARLY?.trim(),
  );
}

export function getPriceId(interval: BillingInterval): string {
  const id = (interval === "year"
    ? process.env.STRIPE_PRICE_YEARLY
    : process.env.STRIPE_PRICE_MONTHLY
  )?.trim();
  if (!id) {
    throw new Error(
      `Falta ${interval === "year" ? "STRIPE_PRICE_YEARLY" : "STRIPE_PRICE_MONTHLY"} (Stripe → Produtos → preço).`,
    );
  }
  return id;
}

/** Modo de teste (chave sk_test_): os links do painel Stripe levam /test. */
export function isStripeTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.trim().startsWith("sk_test_") ?? false;
}

/**
 * Lê a subscrição na Stripe (a fonte de verdade, por isso a ordem dos eventos não importa)
 * e grava o estado na oficina. A oficina vem do metadata `workshop_id` da subscrição ou,
 * em alternativa, do stripe_customer_id. Precisa do cliente com a service role.
 *
 * Devolve o id da oficina atualizada, ou null se não encontrar nenhuma.
 */
export async function syncSubscription(
  admin: SupabaseClient,
  subscriptionId: string,
  source: string,
): Promise<string | null> {
  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const update = workshopUpdateFromSubscription(sub);

  let workshopId = sub.metadata?.workshop_id || null;
  if (!workshopId && update.stripe_customer_id) {
    const { data } = await admin
      .from("workshops")
      .select("id")
      .eq("stripe_customer_id", update.stripe_customer_id)
      .maybeSingle();
    workshopId = data?.id ?? null;
  }
  if (!workshopId) {
    console.warn(`[stripe] Subscrição ${sub.id} sem oficina associada (${source}).`);
    return null;
  }

  const { data: before } = await admin
    .from("workshops")
    .select("name, subscription_status")
    .eq("id", workshopId)
    .maybeSingle();
  if (!before) {
    console.warn(`[stripe] Oficina ${workshopId} da subscrição ${sub.id} não existe.`);
    return null;
  }

  const { error } = await admin.from("workshops").update(update).eq("id", workshopId);
  if (error) throw new Error(`Não foi possível atualizar a oficina: ${error.message}`);

  // Fica no registo do admin só quando o estado muda (os eventos repetem-se muito).
  if (before.subscription_status !== update.subscription_status) {
    await logAdminEvent(admin, {
      actor: "stripe",
      action: "workshop.billing_sync",
      workshopId,
      workshopName: before.name,
      details: {
        source,
        from: before.subscription_status,
        to: update.subscription_status,
        stripe_status: sub.status,
        interval: update.billing_interval,
        current_period_end: update.current_period_end,
      },
    });
  }
  return workshopId;
}

/** Subscrição de uma sessão de checkout concluída (para sincronizar logo no regresso). */
export async function subscriptionIdFromCheckout(
  sessionId: string,
): Promise<{ subscriptionId: string | null; workshopId: string | null }> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return {
    subscriptionId: stripeId(session.subscription as string | { id: string } | null),
    workshopId: session.client_reference_id ?? session.metadata?.workshop_id ?? null,
  };
}
