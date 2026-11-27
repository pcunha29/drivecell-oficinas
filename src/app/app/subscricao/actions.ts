"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { getPriceId, getStripe, isStripeConfigured } from "@/lib/stripe-server";
import { checkoutTrialEnd, hasLiveSubscription, type BillingInterval } from "@/lib/subscription";
import { loadBillingContext } from "./owner-workshop";

export type BillingActionState = { error?: string };

const RETURN_PATH = "/app/subscricao";

/**
 * Abre o checkout da Stripe para o plano escolhido. Só o dono, com o pagamento ligado
 * pelo admin. Se já houver subscrição em curso vai para o portal (não cria outra).
 * Quem ainda está no teste só paga no fim do teste (trial_end na Stripe).
 */
export async function startCheckoutAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const interval: BillingInterval = formData.get("interval") === "year" ? "year" : "month";
  const { user, role, workshop } = await loadBillingContext();
  if (!user) redirect(`/entrar?next=${RETURN_PATH}`);
  if (!workshop || role !== "owner") redirect("/app");

  if (!isStripeConfigured()) return { error: "Os pagamentos ainda não estão disponíveis. Fala connosco." };
  if (workshop.is_demo) return { error: "Esta é uma oficina de demonstração: não tem pagamentos." };
  if (!workshop.checkout_enabled) return { error: "O pagamento na app ainda não está ligado para a tua oficina. Fala connosco." };
  if (hasLiveSubscription(workshop)) return openPortalAction();

  let url: string | null;
  try {
    const stripe = getStripe();

    // Um cliente Stripe por oficina, criado uma vez (mesmo que o checkout seja abandonado).
    let customerId = workshop.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: workshop.name,
        email: user.email ?? undefined,
        preferred_locales: ["pt"],
        metadata: { workshop_id: workshop.id },
      });
      customerId = customer.id;
      const { error } = await createAdminClient()
        .from("workshops")
        .update({ stripe_customer_id: customerId })
        .eq("id", workshop.id);
      if (error) throw new Error(error.message);
    }

    const trialEnd = checkoutTrialEnd(workshop);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: workshop.id,
      metadata: { workshop_id: workshop.id },
      line_items: [{ price: getPriceId(interval), quantity: 1 }],
      subscription_data: {
        metadata: { workshop_id: workshop.id },
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
      // Meios de pagamento: os ligados no painel Stripe (cartão, débito direto SEPA…).
      locale: "pt",
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      customer_update: { name: "auto", address: "auto" },
      allow_promotion_codes: true,
      success_url: `${SITE_URL}${RETURN_PATH}?estado=sucesso&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}${RETURN_PATH}?estado=cancelado`,
    });
    url = session.url;
  } catch (error) {
    console.error("[stripe] Falha ao abrir o checkout:", error);
    return { error: "Não foi possível abrir o pagamento. Tenta de novo daqui a pouco." };
  }

  if (!url) return { error: "Não foi possível abrir o pagamento. Tenta de novo daqui a pouco." };
  redirect(url);
}

/** Portal da Stripe: mudar cartão ou IBAN, ver recibos, mudar de plano, cancelar. */
export async function openPortalAction(): Promise<BillingActionState> {
  const { user, role, workshop } = await loadBillingContext();
  if (!user) redirect(`/entrar?next=${RETURN_PATH}`);
  if (!workshop || role !== "owner") redirect("/app");
  if (!isStripeConfigured()) return { error: "Os pagamentos ainda não estão disponíveis. Fala connosco." };
  if (!workshop.stripe_customer_id) return { error: "Ainda não há pagamentos associados à tua oficina." };

  let url: string;
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: workshop.stripe_customer_id,
      return_url: `${SITE_URL}${RETURN_PATH}`,
      locale: "pt",
    });
    url = session.url;
  } catch (error) {
    console.error("[stripe] Falha ao abrir o portal:", error);
    return { error: "Não foi possível abrir a gestão da subscrição. Tenta de novo daqui a pouco." };
  }
  redirect(url);
}
