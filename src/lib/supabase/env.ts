export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chavePublica) {
    throw new Error(
      "Variáveis do Supabase ausentes. Rode `npm run env:local` com o Supabase local iniciado.",
    );
  }
  return { url, chavePublica };
}
