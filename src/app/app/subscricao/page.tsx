import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStripeConfigured, subscriptionIdFromCheckout, syncSubscription } from "@/lib/stripe-server";
import { checkoutTrialEnd } from "@/lib/subscription";
import { SubscriptionView } from "@/components/subscription/subscription-view";
import { canSeeBilling, loadBillingContext } from "./owner-workshop";

export const dynamic = "force-dynamic";

export const metadata = { title: "Subscrição" };

type SearchParams = Promise<{ estado?: string; session_id?: string }>;

/**
 * Subscrição da oficina (só o dono, e só se o admin ligou o pagamento na app ou se já
 * houver cliente na Stripe). No regresso do checkout sincroniza logo a subscrição, para
 * a conta ficar ativa sem esperar pelo webhook.
 */
export default async function SubscricaoPage({ searchParams }: { searchParams: SearchParams }) {
  const { estado, session_id: sessionId } = await searchParams;

  let context = await loadBillingContext();
  if (!context.user) redirect("/entrar?next=/app/subscricao");
  if (!context.workshop || context.role !== "owner" || !canSeeBilling(context.workshop)) {
    redirect("/app");
  }

  const configured = isStripeConfigured();

  if (estado === "sucesso" && sessionId && configured) {
    try {
      const { subscriptionId, workshopId } = await subscriptionIdFromCheckout(sessionId);
      if (subscriptionId && workshopId === context.workshop.id) {
        await syncSubscription(createAdminClient(), subscriptionId, "checkout.return");
        context = await loadBillingContext();
      }
    } catch (error) {
      // O webhook trata do resto; aqui só se adianta a atualização.
      console.error("[stripe] Falha ao sincronizar no regresso do checkout:", error);
    }
  }

  const workshop = context.workshop!;
  const trialEnd = checkoutTrialEnd(workshop);

  return (
    <SubscriptionView
      workshop={workshop}
      configured={configured}
      notice={estado === "sucesso" ? "success" : estado === "cancelado" ? "canceled" : null}
      firstChargeOn={trialEnd ? new Date(trialEnd * 1000).toISOString() : null}
    />
  );
}
