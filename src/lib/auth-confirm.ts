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
