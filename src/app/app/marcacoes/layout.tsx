import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MembershipRow = {
  workshops: { calendar_enabled: boolean } | { calendar_enabled: boolean }[] | null;
};

/**
 * As Marcações só existem com a opção ligada (o admin controla por oficina).
 * Desligada — ou sem a coluna, se a migração ainda não foi aplicada — volta ao quadro.
 * O menu também esconde a entrada.
 */
export default async function MarcacoesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/app/marcacoes");

  // Mesma oficina que a app usa: primeiro aquela em que é dono (como current_workshop_id()).
  const { data, error } = await supabase
    .from("workshop_members")
    .select("workshops (calendar_enabled)")
    .eq("user_id", user.id)
    .order("role", { ascending: false })
    .order("workshop_id")
    .limit(1)
    .maybeSingle();

  const embedded = (data as MembershipRow | null)?.workshops ?? null;
  const workshop = Array.isArray(embedded) ? embedded[0] : embedded;
  if (error || !workshop?.calendar_enabled) redirect("/app");

  return children;
}
