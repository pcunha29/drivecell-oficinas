import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * A faturação é só para o dono da oficina. Os mecânicos (role "member") que abram
 * /app/faturacao diretamente voltam ao quadro. O menu também esconde a entrada.
 */
export default async function FaturacaoLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=/app/faturacao");

  // Mesma oficina que a app usa: primeiro aquela em que é dono (como current_workshop_id()).
  const { data: membership } = await supabase
    .from("workshop_members")
    .select("role")
    .eq("user_id", user.id)
    .order("role", { ascending: false })
    .order("workshop_id")
    .limit(1)
    .maybeSingle();

  if (membership?.role !== "owner") redirect("/app");

  return children;
}
