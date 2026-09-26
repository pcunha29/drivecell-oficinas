import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/safe-next-path";

async function signOut(request: NextRequest, status: 302 | 303) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), "/entrar");
  const loginUrl = new URL(next, request.url);
  const response = NextResponse.redirect(loginUrl, status);

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.signOut();

  return response;
}

export async function GET(request: NextRequest) {
  return signOut(request, 302);
}

/** Formulários "Sair": 303 para o browser seguir com GET para /entrar. */
export async function POST(request: NextRequest) {
  return signOut(request, 303);
}
