import { NextResponse } from "next/server";
import { CONTINUE_PATH, continueUrl, isOtpType } from "@/lib/auth-confirm";
import { safeNextPath } from "@/lib/safe-next-path";

/**
 * Links dos emails do Supabase (convite, recuperação…) e do admin. Aceita os três formatos:
 *
 * 1. `token_hash` (template recomendado):
 *    {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/conta/definir-palavra-passe
 *    → página com o botão "Continuar" (o token não é gasto no GET; ver src/lib/auth-confirm.ts).
 * 2. `code` (fluxo PKCE) → /auth/callback, que troca o código por sessão.
 * 3. Nenhum dos dois: o template por omissão devolve a sessão no fragmento (#access_token=…),
 *    que não chega ao servidor. Segue para /auth/continuar — o browser mantém o fragmento no
 *    redirecionamento — e a página lê-o no browser.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && isOtpType(type)) {
    return NextResponse.redirect(continueUrl(origin, tokenHash, type, next));
  }

  if (code) {
    const params = new URLSearchParams({ code, next });
    return NextResponse.redirect(`${origin}/auth/callback?${params.toString()}`);
  }

  return NextResponse.redirect(`${origin}${CONTINUE_PATH}?${new URLSearchParams({ next }).toString()}`);
}
