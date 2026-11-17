import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Links de uso único dos emails (convite, recuperação…) e do "link de acesso" do admin.
 *
 * O token NÃO é usado no GET: as pré-visualizações do WhatsApp e os antivírus dos emails
 * abrem o link antes da pessoa e gastavam-no. O GET leva a /auth/continuar e o token só é
 * trocado por sessão quando a pessoa carrega em "Continuar" (POST).
 */
export const CONTINUE_PATH = "/auth/continuar";

const OTP_TYPES = new Set<EmailOtpType>(["invite", "recovery", "signup", "email", "magiclink"]);

export function isOtpType(value: string | null | undefined): value is EmailOtpType {
  return typeof value === "string" && OTP_TYPES.has(value as EmailOtpType);
}

/** Destino de /auth/confirm: a página com o botão, com os mesmos parâmetros. */
export function continueUrl(origin: string, tokenHash: string, type: EmailOtpType, next: string): string {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next });
  return `${origin}${CONTINUE_PATH}?${params.toString()}`;
}

export const CONFIRM_MESSAGES = {
  expired: "Este link já foi usado ou expirou. Pede-nos um link novo por WhatsApp ou email.",
  generic: "Não foi possível confirmar o acesso. Tenta outra vez dentro de momentos.",
} as const;

/** A Supabase devolve otp_expired tanto para links expirados como já usados. */
export function confirmErrorMessage(error: { code?: string; status?: number; message?: string }): string {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  if (
    code === "otp_expired" ||
    code === "flow_state_expired" ||
    message.includes("expired") ||
    message.includes("invalid") ||
    error.status === 403
  ) {
    return CONFIRM_MESSAGES.expired;
  }
  return CONFIRM_MESSAGES.generic;
}

// ---------------------------------------------------------------------------
// Links com a sessão no fragmento (#access_token=…).
//
// Com o template de email por omissão ({{ .ConfirmationURL }}), a Supabase confirma o link
// no próprio domínio e volta ao redirectTo com a sessão no fragmento do URL (fluxo
// "implicit"). O fragmento nunca chega ao servidor, por isso é lido no browser. Também traz
// os erros (#error_code=otp_expired…). Assim os convites funcionam mesmo sem o template
// personalizado com token_hash.
// ---------------------------------------------------------------------------

/** Onde o convidado (ou quem recupera a conta) define a palavra-passe. */
export const SET_PASSWORD_PATH = "/conta/definir-palavra-passe";

export type AuthHash =
  | { kind: "session"; accessToken: string; refreshToken: string; type: string | null }
  | { kind: "error"; code: string; description: string };

/** Lê o fragmento devolvido pela Supabase; null se não for um retorno de autenticação. */
export function parseAuthHash(hash: string): AuthHash | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    return { kind: "session", accessToken, refreshToken, type: params.get("type") };
  }
  const code = params.get("error_code") || params.get("error");
  if (code) {
    return { kind: "error", code, description: params.get("error_description") ?? "" };
  }
  return null;
}

/** Destino depois de abrir a sessão: convites e recuperações vão definir a palavra-passe. */
export function hashDestination(type: string | null, next: string): string {
  if (type === "invite" || type === "recovery") return SET_PASSWORD_PATH;
  return next;
}

/** Mensagem para um erro vindo no fragmento (a Supabase usa otp_expired para usado/expirado). */
export function hashErrorMessage(error: { code: string; description: string }): string {
  return confirmErrorMessage({ code: error.code, message: error.description, status: error.code === "access_denied" ? 403 : undefined });
}
