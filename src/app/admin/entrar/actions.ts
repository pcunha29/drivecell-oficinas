"use server";

import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export type AdminLoginState = { error: string | null; email: string };

const GENERIC_ERROR = "Email ou palavra-passe incorretos.";

/**
 * Login do admin. Só aceita emails em ADMIN_EMAILS; qualquer outra conta
 * recebe o mesmo erro genérico (não revela quem é admin) e a sessão é fechada.
 */
export async function adminLoginAction(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Indica o email e a palavra-passe.", email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const rateLimited = error.status === 429 || /rate limit/i.test(error.message);
    return {
      error: rateLimited ? "Demasiadas tentativas. Espera um pouco e tenta outra vez." : GENERIC_ERROR,
      email,
    };
  }

  if (!isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return { error: GENERIC_ERROR, email };
  }

  redirect("/admin");
}
