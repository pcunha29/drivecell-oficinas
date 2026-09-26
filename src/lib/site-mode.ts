import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Modo "em construção" do site público.
 * Ligado no /admin/site; guardado em public.site_settings (linha única, id = 1).
 */

/** Página mostrada no lugar das páginas públicas enquanto o modo está ligado. */
export const CONSTRUCTION_PATH = "/em-construcao";

/**
 * Páginas escondidas pelo modo. /termos, /entrar, /app, /admin e /auth continuam
 * acessíveis (clientes já criados, convites e a política de privacidade).
 */
export const CONSTRUCTION_GATED_PATHS: ReadonlySet<string> = new Set(["/", "/precos"]);

/**
 * Lê o estado atual. Em caso de erro devolve false (o site normal continua
 * visível em vez de ficar tudo escondido por uma falha de rede).
 */
export async function readUnderConstruction(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("under_construction")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return false;
    return data.under_construction === true;
  } catch {
    return false;
  }
}
