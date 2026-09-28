import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Modo "em construção" do site público.
 * Ligado no /admin/site; guardado em public.site_settings (linha única, id = 1).
 */

/** Página mostrada no lugar das páginas públicas enquanto o modo está ligado. */
export const CONSTRUCTION_PATH = "/em-construcao";

/**
 * Caminhos que continuam acessíveis com o modo ligado (e respetivos subcaminhos).
 * Tudo o resto - páginas públicas atuais e futuras, rotas inexistentes - mostra a
 * página de espera. Assim uma página nova nunca fica exposta por esquecimento.
 */
const CONSTRUCTION_ALLOWED_PREFIXES = [
  CONSTRUCTION_PATH,
  "/termos", // política de privacidade (link do formulário)
  "/entrar",
  "/login",
  "/registar", // o middleware já redireciona
  "/onboarding", // o middleware já redireciona
  "/auth", // convites, callback, signout
  "/conta",
  "/app",
  "/sem-oficina",
  "/admin",
  "/api",
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** true = o caminho não é afetado pelo modo "em construção". */
export function isAllowedDuringConstruction(pathname: string): boolean {
  // Ficheiros (robots.txt, vídeos, manifest, imagens…): último segmento com extensão.
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  if (last.includes(".")) return true;
  return CONSTRUCTION_ALLOWED_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}

/**
 * Lê o estado atual. Em caso de erro devolve false (o site normal continua
 * visível em vez de ficar tudo escondido por uma falha de rede).
 */
export async function readUnderConstruction(
  supabase: SupabaseClient,
): Promise<boolean> {
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
