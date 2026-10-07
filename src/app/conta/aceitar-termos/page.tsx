import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthSplit } from "@/components/auth/auth-split";
import { AcceptTermsForm } from "@/components/auth/accept-terms-form";
import { createClient } from "@/lib/supabase/server";
import { ACCEPT_TERMS_PATH, hasAcceptedCurrentTerms } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Aceitar os termos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Contas já ativas que ainda não aceitaram a versão atual dos termos (a app redireciona para aqui). */
export default async function AceitarTermosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/entrar?next=${encodeURIComponent(ACCEPT_TERMS_PATH)}`);
  if (await hasAcceptedCurrentTerms(supabase, user.id)) redirect("/app");

  // Já aceitou uma versão anterior? Então é uma atualização dos termos.
  const { count } = await supabase
    .from("terms_acceptances")
    .select("version", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <AuthSplit
      headline={
        <>
          Uma última
          <br />
          <em className="text-accent-soft">confirmação.</em>
        </>
      }
    >
      <AcceptTermsForm email={user.email ?? ""} isUpdate={(count ?? 0) > 0} />
    </AuthSplit>
  );
}
