// Gera .env.local a partir do Supabase LOCAL do slot desta worktree.
// As chaves locais são as de desenvolvimento do Supabase CLI; nunca use em produção.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { lerSlot, portaE2E } from "./slot.mjs";

const slot = lerSlot();
const saida = execFileSync("node", ["scripts/supabase.mjs", "status", "-o", "json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});
const status = JSON.parse(saida.slice(saida.indexOf("{"), saida.lastIndexOf("}") + 1));

const linhas = [
  `# Gerado por scripts/gerar-env.mjs — Supabase local (slot ${slot}), dados fictícios`,
  `CRM_SLOT=${slot}`,
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY ?? status.ANON_KEY}`,
  "# Somente para os testes (preparo e limpeza). Nunca exponha no navegador.",
  `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
  `SUPABASE_DB_URL=${status.DB_URL}`,
  `E2E_PORT=${portaE2E(slot)}`,
  "",
];
writeFileSync(".env.local", linhas.join("\n"));
console.log(`.env.local gerado (slot ${slot}: ${status.API_URL}, e2e ${portaE2E(slot)})`);
