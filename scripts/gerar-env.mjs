// Gera .env.local a partir do Supabase LOCAL em execução (`npm run db:start`).
// As chaves locais são as de desenvolvimento do Supabase CLI; nunca use em produção.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const saida = execFileSync("npx", ["supabase", "status", "-o", "json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});
const inicio = saida.indexOf("{");
const status = JSON.parse(saida.slice(inicio, saida.lastIndexOf("}") + 1));

const linhas = [
  "# Gerado por scripts/gerar-env.mjs — Supabase local, dados fictícios",
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY ?? status.ANON_KEY}`,
  "# Somente para os testes (limpeza de dados criados). Nunca exponha no navegador.",
  `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
  `SUPABASE_DB_URL=${status.DB_URL}`,
  "",
];
writeFileSync(".env.local", linhas.join("\n"));
console.log(`.env.local gerado (${status.API_URL})`);
