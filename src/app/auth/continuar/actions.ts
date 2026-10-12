"use server";

import { redirect } from "next/navigation";
import { CONFIRM_MESSAGES, confirmErrorMessage, isOtpType } from "@/lib/auth-confirm";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

export type ConfirmAccessState = { error: string | null };

/** Troca o token de uso único por sessão. Só corre quando a pessoa carrega em "Continuar". */
export async function confirmAccessAction(
  _prev: ConfirmAccessState,
  formData: FormData,
): Promise<ConfirmAccessState> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!tokenHash || !isOtpType(type)) {
    return { error: CONFIRM_MESSAGES.expired };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return { error: confirmErrorMessage(error) };
  }

  redirect(next);
}
