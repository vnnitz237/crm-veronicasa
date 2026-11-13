import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Renova a sessão do Supabase a cada requisição e manda quem não está logado
 * para /login. A autorização dos dados continua no banco (RLS).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, chavePublica } = supabaseEnv();

  const supabase = createServerClient(url, chavePublica, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([chave, valor]) => response.headers.set(chave, valor));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);
  const emLogin = request.nextUrl.pathname.startsWith("/login");

  if (!logado && !emLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
