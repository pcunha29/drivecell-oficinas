import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, syncSubscription } from "@/lib/stripe-server";
import { stripeId } from "@/lib/subscription";

export const dynamic = "force-dynamic";

/**
 * Webhook da Stripe: mantém o estado da subscrição de cada oficina.
 * POST /api/stripe/webhook (endpoint configurado no painel Stripe, ou `stripe listen`).
 *
 * Cada evento só serve para saber QUAL subscrição mudou: o estado é lido de novo na
 * Stripe (syncSubscription), por isso eventos repetidos ou fora de ordem não estragam nada.
 * Responde 500 se a gravação falhar, para a Stripe tentar outra vez.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[stripe] Falta STRIPE_WEBHOOK_SECRET.");
    return NextResponse.json({ error: "webhook não configurado" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "sem assinatura" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.warn("[stripe] Assinatura inválida:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  }

  const subscriptionId = subscriptionIdFromEvent(event);
  if (!subscriptionId) return NextResponse.json({ received: true, ignored: event.type });

  try {
    const workshopId = await syncSubscription(createAdminClient(), subscriptionId, event.type);
    return NextResponse.json({ received: true, workshop: workshopId });
  } catch (error) {
    console.error(`[stripe] Falha ao sincronizar ${subscriptionId} (${event.type}):`, error);
    return NextResponse.json({ error: "falha ao sincronizar" }, { status: 500 });
  }
}

/** A subscrição a que o evento diz respeito, ou null para eventos que não interessam. */
function subscriptionIdFromEvent(event: Stripe.Event): string | null {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      if (session.mode !== "subscription") return null;
      return stripeId(session.subscription as string | { id: string } | null);
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      return event.data.object.id;
    case "invoice.paid":
    case "invoice.payment_failed": {
      // Nas versões novas da API a subscrição está em parent.subscription_details.
      const invoice = event.data.object as unknown as {
        subscription?: string | { id: string } | null;
        parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
      };
      return stripeId(invoice.parent?.subscription_details?.subscription ?? invoice.subscription ?? null);
    }
    default:
      return null;
  }
}
