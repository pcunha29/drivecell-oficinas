import type { User } from "@supabase/supabase-js";

/**
 * Login com Google é só para contas que já existem (criadas pelo admin).
 * A Supabase cria um utilizador novo quando alguém entra com uma conta Google
 * desconhecida; estas regras identificam esse caso para o recusar e apagar.
 */

/** Uma conta Google criada há menos disto, sem oficina, é considerada nova. */
export const NEW_OAUTH_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

/** Erros que a Supabase devolve no callback quando o registo de contas novas está desligado. */
export function isSignupDisabledError(params: URLSearchParams): boolean {
  const code = params.get("error_code") ?? "";
  const description = params.get("error_description") ?? "";
  return code === "signup_disabled" || /signups? not allowed/i.test(description);
}

/** Conta acabada de criar pelo login com Google (sem convite, sem palavra-passe). */
export function isFreshOAuthOnlyAccount(user: Pick<User, "created_at" | "app_metadata">, now: number = Date.now()): boolean {
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider as string];
  const onlyOAuth = providers.length > 0 && providers.every((p) => p && p !== "email");
  const createdAt = new Date(user.created_at).getTime();
  return onlyOAuth && Number.isFinite(createdAt) && now - createdAt < NEW_OAUTH_ACCOUNT_WINDOW_MS;
}

/** Página de login para onde voltar em caso de erro: a do admin quando o destino é o admin. */
export function loginPathFor(next: string): "/admin/entrar" | "/entrar" {
  return next === "/admin" || next.startsWith("/admin/") ? "/admin/entrar" : "/entrar";
}
