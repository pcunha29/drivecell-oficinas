import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthSplit } from "@/components/auth/auth-split";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Definir palavra-passe",
  robots: { index: false, follow: false },
};

// Depende da sessão: nunca pré-renderizar.
export const dynamic = "force-dynamic";

const PATH = "/conta/definir-palavra-passe";

export default async function DefinirPalavraPassePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/entrar?next=${encodeURIComponent(PATH)}`);

  return (
    <AuthSplit
      headline={
        <>
          Falta só
          <br />
          <em className="text-accent-soft">a palavra-passe.</em>
        </>
      }
      asideFooter={<p className="m-0 font-mono text-[12px] text-on-dark-3">Dados alojados na União Europeia</p>}
    >
      <SetPasswordForm email={user.email ?? ""} />
    </AuthSplit>
  );
}
