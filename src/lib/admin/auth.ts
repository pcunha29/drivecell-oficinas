import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "./emails";

export { isAdminEmail };

/** Utilizador com sessão e email em ADMIN_EMAILS, ou null. */
export async function getAdminUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Para server actions: lança erro se quem chama não for admin.
 * Chamar no início de CADA action — o layout não protege as actions.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) {
    throw new Error("Sem permissão para esta operação.");
  }
  return user;
}

/** Para layouts/páginas: quem não for admin vai para o login do admin. */
export async function requireAdminPage(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/entrar");
  return user;
}
