import { NextResponse } from "next/server";
import { continueUrl, isOtpType } from "@/lib/auth-confirm";
import { safeNextPath } from "@/lib/safe-next-path";

/**
 * Links dos emails do Supabase (convite, recuperação…) e do admin, com `token_hash`.
 * Template de convite:
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/conta/definir-palavra-passe
 *
 * Não troca o token aqui (ver src/lib/auth-confirm.ts): só leva à página com o botão "Continuar".
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next"));

  if (tokenHash && isOtpType(type)) {
    return NextResponse.redirect(continueUrl(origin, tokenHash, type, next));
  }

  return NextResponse.redirect(`${origin}/entrar?error=auth`);
}
