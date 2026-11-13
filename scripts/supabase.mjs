#!/usr/bin/env node
// Wrapper do Supabase CLI. No slot 0 repassa os argumentos sem mudança.
// Nos slots 1–4 sincroniza supabase/ numa cópia de trabalho com project_id e portas
// próprios (545xx -> 54(5+n)xx) e roda o CLI com --workdir, isolando o banco.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dirSlot, lerSlot } from "./slot.mjs";

const slot = lerSlot();
const args = process.argv.slice(2);

if (slot > 0) {
  const base = dirSlot(slot);
  const destino = join(base, "supabase");
  mkdirSync(destino, { recursive: true });
  rmSync(join(destino, "migrations"), { recursive: true, force: true });
  cpSync("supabase/migrations", join(destino, "migrations"), { recursive: true });
  cpSync("supabase/seed.sql", join(destino, "seed.sql"));
  const config = readFileSync("supabase/config.toml", "utf8")
    .replace(/^project_id = ".*"$/m, `project_id = "crm-veronica-s${slot}"`)
    .replace(/\b545(\d\d)\b/g, (_, fim) => `54${5 + slot}${fim}`)
    .replace(/^inspector_port = (\d+)$/m, (_, p) => `inspector_port = ${Number(p) + slot}`);
  writeFileSync(join(destino, "config.toml"), config);
  args.push("--workdir", base);
}

const r = spawnSync(join("node_modules", ".bin", "supabase"), args, { stdio: "inherit" });
process.exit(r.status ?? 1);
