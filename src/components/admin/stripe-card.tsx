import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/admin/format";
import type { AdminWorkshop } from "@/lib/admin/data";

const PLAN: Record<"month" | "year", string> = { month: "Mensal", year: "Anual" };

/** Resumo do que a Stripe sabe desta oficina, com links para o painel Stripe. */
export function StripeCard({ workshop, testMode }: { workshop: AdminWorkshop; testMode: boolean }) {
  const base = `https://dashboard.stripe.com${testMode ? "/test" : ""}`;
  const hasStripe = Boolean(workshop.stripe_customer_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagamento (Stripe)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!hasStripe ? (
          <p className="text-muted-foreground">
            {workshop.checkout_enabled
              ? "Pagamento na app ligado. Ainda não abriu o checkout."
              : "Sem cliente na Stripe. Liga «Pagamento na app» para o dono poder pagar sozinho."}
          </p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-muted-foreground">Plano</dt>
            <dd>{workshop.billing_interval ? PLAN[workshop.billing_interval] : "Ainda sem subscrição"}</dd>
            {workshop.current_period_end && (
              <>
                <dt className="text-muted-foreground">
                  {workshop.cancel_at_period_end ? "Ativa até" : "Renova a"}
                </dt>
                <dd>{formatDate(workshop.current_period_end)}</dd>
              </>
            )}
            {workshop.cancel_at_period_end && (
              <>
                <dt className="text-muted-foreground">Cancelamento</dt>
                <dd className="text-amber-700 dark:text-amber-400">Pedido pelo cliente</dd>
              </>
            )}
          </dl>
        )}
        {hasStripe && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              href={`${base}/customers/${workshop.stripe_customer_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-4 hover:no-underline"
            >
              Cliente <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            {workshop.stripe_subscription_id && (
              <a
                href={`${base}/subscriptions/${workshop.stripe_subscription_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:no-underline"
              >
                Subscrição <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        )}
        {testMode && <p className="text-xs text-muted-foreground">Modo de teste da Stripe.</p>}
      </CardContent>
    </Card>
  );
}
