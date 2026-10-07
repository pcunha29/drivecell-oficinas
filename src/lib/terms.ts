import type { SupabaseClient } from "@supabase/supabase-js";
import { TERMS_VERSION } from "@/content/legal";

/** Página onde as contas já ativas aceitam os termos (primeiro acesso ou versão nova). */
export const ACCEPT_TERMS_PATH = "/conta/aceitar-termos";

/**
 * true se o utilizador já aceitou a versão atual dos termos.
 * Em caso de erro (ex.: migração ainda por aplicar) devolve true, para nunca
 * bloquear o acesso à app por uma falha técnica.
 */
export async function hasAcceptedCurrentTerms(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("terms_acceptances")
    .select("version")
    .eq("user_id", userId)
    .eq("version", TERMS_VERSION)
    .maybeSingle();
  if (error) return true;
  return data !== null;
}

/** Regista a aceitação da versão atual (hora do servidor). Devolve uma mensagem de erro ou null. */
export async function acceptCurrentTerms(supabase: SupabaseClient): Promise<string | null> {
  const { error } = await supabase.rpc("accept_terms", { p_version: TERMS_VERSION });
  return error ? "Não foi possível registar a aceitação dos termos. Tenta outra vez dentro de momentos." : null;
}
