import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/auth";
import { isFreshOAuthOnlyAccount, isSignupDisabledError, loginPathFor } from "@/lib/oauth-guard";
import { safeNextPath } from "@/lib/safe-next-path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Fluxo PKCE (login com Google, recuperação de palavra-passe): troca o `code` por sessão.
 * Login com Google só para contas existentes: uma conta Google desconhecida (criada agora,
 * sem oficina e que não é admin) é recusada e apagada.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const toLogin = (error: string) => NextResponse.redirect(`${origin}${loginPathFor(next)}?error=${error}`);

  // Com "Allow new users to sign up" desligado na Supabase, o erro chega aqui.
  if (searchParams.get("error")) {
    return toLogin(isSignupDisabledError(searchParams) ? "sem_conta" : "auth");
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;
      if (!isAdminEmail(user.email) && isFreshOAuthOnlyAccount(user)) {
        const { data: membership } = await supabase
          .from("workshop_members")
          .select("workshop_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!membership) {
          await supabase.auth.signOut();
          try {
            await createAdminClient().auth.admin.deleteUser(user.id);
          } catch {
            // Sem service role (ex.: ambiente local): fica a conta vazia, sem acesso a nada.
          }
          return toLogin("sem_conta");
        }
      }

      // Login com Google a partir do admin: só contas em ADMIN_EMAILS (como no login com palavra-passe).
      if (loginPathFor(next) === "/admin/entrar" && !isAdminEmail(user.email)) {
        await supabase.auth.signOut();
        return toLogin("sem_acesso");
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return toLogin("auth");
}
