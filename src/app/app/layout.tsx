import { redirect } from "next/navigation";
import { AppProvider } from "@/components/layout/app-provider";
import { isAdminEmail } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?next=/app");
  }

  // Sem oficina associada: as oficinas são criadas pelo admin (sem registo self-service).
  const { data: membership } = await supabase
    .from("workshop_members")
    .select("workshop_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    // O admin não tem oficina: vai para o painel em vez de "sem oficina".
    redirect(isAdminEmail(user.email) ? "/admin" : "/sem-oficina");
  }

  return <AppProvider>{children}</AppProvider>;
}
