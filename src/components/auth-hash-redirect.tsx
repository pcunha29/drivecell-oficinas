"use client";

import { useEffect } from "react";
import { CONTINUE_PATH, hashDestination, parseAuthHash } from "@/lib/auth-confirm";
import { safeNextPath } from "@/lib/safe-next-path";

/**
 * Rede de segurança dos links da Supabase: se a sessão (#access_token=…) ou um erro
 * (#error_code=…) chegar a outra página — p.ex. a página inicial, quando o redirectTo não
 * está nos "Redirect URLs" do Supabase, ou /entrar — leva o fragmento para /auth/continuar,
 * que abre a sessão e segue para definir a palavra-passe. Não faz nada nas outras visitas.
 */
export function AuthHashRedirect() {
  useEffect(() => {
    if (window.location.pathname === CONTINUE_PATH) return;
    const parsed = parseAuthHash(window.location.hash);
    if (!parsed) return;
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    const target = parsed.kind === "session" ? hashDestination(parsed.type, next) : next;
    const params = new URLSearchParams({ next: target });
    window.location.replace(`${CONTINUE_PATH}?${params.toString()}${window.location.hash}`);
  }, []);
  return null;
}
