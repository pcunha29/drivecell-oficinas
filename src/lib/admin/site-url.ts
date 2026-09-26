/** Caminho onde o dono convidado define a palavra-passe. */
export const SET_PASSWORD_PATH = "/conta/definir-palavra-passe";

/** URL pública da app (sem barra final), a partir de NEXT_PUBLIC_SITE_URL. */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!url) {
    if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
    throw new Error("Falta NEXT_PUBLIC_SITE_URL (ex.: https://drivecell.pt).");
  }
  return url.replace(/\/+$/, "");
}

/** redirectTo dos convites: /auth/confirm troca o token e segue para definir a palavra-passe. */
export function getInviteRedirectUrl(): string {
  return `${getSiteUrl()}/auth/confirm?next=${SET_PASSWORD_PATH}`;
}

/** Link direto (sem passar pelo email do Supabase) a partir de um hashed_token de generateLink. */
export function buildConfirmLink(tokenHash: string, type: string): string {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type,
    next: SET_PASSWORD_PATH,
  });
  return `${getSiteUrl()}/auth/confirm?${params.toString()}`;
}
