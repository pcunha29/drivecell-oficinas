import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import { isAdminEmail } from "@/lib/admin/emails";
import {
  CONSTRUCTION_GATED_PATHS,
  CONSTRUCTION_PATH,
  readUnderConstruction,
} from "@/lib/site-mode";

/** Caminhos (e respetivos subcaminhos) que exigem sessão iniciada. */
const PROTECTED_PREFIXES = ["/app", "/conta", "/sem-oficina", "/admin"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Login próprio do admin (público). */
const ADMIN_LOGIN = "/admin/entrar";

function isProtectedPath(pathname: string): boolean {
  if (pathname === ADMIN_LOGIN) return false;
  return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/**
 * Registo self-service desativado: as oficinas são criadas pelo admin.
 * Os ficheiros mantêm-se, mas estas rotas levam para o contacto na landing.
 */
const DISABLED_PREFIXES = ["/registar", "/onboarding"];

function isDisabledPath(pathname: string): boolean {
  return DISABLED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/** Páginas de autenticação: quem já tem sessão vai direto para /app. */
const AUTH_PAGES = new Set(["/login", "/entrar"]);

function redirectToContact(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  url.hash = "contacto";
  return NextResponse.redirect(url);
}

/** Mantém os cookies de sessão renovados pelo Supabase numa nova resposta. */
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

/**
 * Envia para /entrar, guardando o destino em `?next` para voltar depois do login.
 * O /admin tem o seu próprio login, sem ?next (vai sempre para /admin).
 */
function redirectToLogin(request: NextRequest) {
  if (matchesPrefix(request.nextUrl.pathname, "/admin")) {
    return redirectTo(request, ADMIN_LOGIN);
  }
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/entrar";
  url.search = "";
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

/**
 * Rotas públicas: /, /precos, /termos, /entrar, /login, /auth/*, /em-construcao
 * (/ e /precos passam a mostrar /em-construcao quando o modo está ligado, exceto ao admin)
 * (e qualquer outra fora das protegidas, que responde com 404 se não existir).
 * /admin/* exige sessão aqui; a página de admin valida depois se o email é de admin.
 * As rotas /api/* validam a sessão por si.
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isDisabledPath(pathname)) {
    return redirectToContact(request);
  }

  const protectedPath = isProtectedPath(pathname);

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // Nas páginas públicas escondíveis, o estado do modo "em construção" é lido
    // em paralelo com a sessão (uma leitura leve, sem cache: o toggle é imediato).
    const gatedPath = CONSTRUCTION_GATED_PATHS.has(pathname) || pathname === CONSTRUCTION_PATH;
    const [
      {
        data: { user },
      },
      underConstruction,
    ] = await Promise.all([
      supabase.auth.getUser(),
      gatedPath ? readUnderConstruction(supabase) : Promise.resolve(false),
    ]);

    if (!user && protectedPath) {
      return redirectToLogin(request);
    }

    if (user && AUTH_PAGES.has(pathname)) {
      return redirectTo(request, "/app");
    }

    const isAdmin = isAdminEmail(user?.email);

    // Painel de admin: quem tem sessão mas não é admin vai para o login do admin.
    if (user && !isAdmin && matchesPrefix(pathname, "/admin") && pathname !== ADMIN_LOGIN) {
      return redirectTo(request, ADMIN_LOGIN);
    }

    // Login do admin: só salta para o painel quem já é admin (evita ciclos).
    if (isAdmin && pathname === ADMIN_LOGIN) {
      return redirectTo(request, "/admin");
    }

    // Modo "em construção": o público vê a página de espera; o admin vê o site real
    // (e pode abrir /em-construcao diretamente para a pré-visualizar).
    if (CONSTRUCTION_GATED_PATHS.has(pathname) && underConstruction && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = CONSTRUCTION_PATH;
      const rewrite = withCookies(NextResponse.rewrite(url, { request }), supabaseResponse);
      rewrite.headers.set("X-Robots-Tag", "noindex, nofollow");
      return rewrite;
    }
    if (pathname === CONSTRUCTION_PATH && !underConstruction && !isAdmin) {
      return withCookies(redirectTo(request, "/"), supabaseResponse);
    }

    return supabaseResponse;
  } catch {
    // Sem Supabase configurado (ou indisponível): as páginas públicas continuam a funcionar.
    if (protectedPath) {
      return redirectToLogin(request);
    }
    return supabaseResponse;
  }
}
