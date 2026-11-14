import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

function redirecionarComCookies(request: NextRequest, response: NextResponse, caminho: string) {
  const destino = new URL(caminho, request.url);
  const redirecionamento = NextResponse.redirect(destino);
  response.cookies.getAll().forEach((cookie) => redirecionamento.cookies.set(cookie));
  return redirecionamento;
}

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
  const usuarioId = data?.claims?.sub;
  const logado = Boolean(usuarioId);
  const emLogin = request.nextUrl.pathname.startsWith("/login");

  // Downloads (*.csv) não redirecionam: sem sessão, 401 sem dados.
  if (!logado && request.nextUrl.pathname.endsWith(".csv")) {
    return new NextResponse("Não autenticado.", { status: 401 });
  }

  if (!logado && !emLogin) {
    return redirecionarComCookies(request, response, "/login");
  }

  if (usuarioId) {
    const { data: perfilAtivo } = await supabase
      .from("perfis")
      .select("id")
      .eq("id", usuarioId)
      .eq("ativo", true)
      .maybeSingle();

    if (!perfilAtivo) {
      await supabase.auth.signOut();
      if (request.nextUrl.pathname.endsWith(".csv")) {
        const naoAutenticado = new NextResponse("Não autenticado.", { status: 401 });
        response.cookies.getAll().forEach((cookie) => naoAutenticado.cookies.set(cookie));
        return naoAutenticado;
      }
      if (!emLogin) {
        return redirecionarComCookies(request, response, "/login?erro=acesso-desativado");
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
