/**
 * Portal de cliente Stripe (faturas, método de pagamento, cancelar).
 * Só existe se `NEXT_PUBLIC_STRIPE_BILLING_PORTAL` estiver definido; sem valor por defeito.
 */
export function getStripeBillingPortalUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_STRIPE_BILLING_PORTAL?.trim();
  return url ? url : null;
}
