// Prepara o ambiente desta worktree: grava o slot, sobe a pilha Supabase dele e gera .env.local.
// Uso: CRM_SLOT=1 npm run ambiente:isolado   (ou: npm run ambiente:isolado -- 1)
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";

const arg = process.argv[2];
if (arg !== undefined) process.env.CRM_SLOT = arg;
const { lerSlot } = await import("./slot.mjs");
const slot = lerSlot();

if (slot === 0) rmSync(".crm-slot", { force: true });
else writeFileSync(".crm-slot", `${slot}\n`);

const run = (args) => execFileSync("node", args, { stdio: "inherit", env: { ...process.env, CRM_SLOT: String(slot) } });
run(["scripts/supabase.mjs", "start", "-x", "studio,imgproxy,mailpit,realtime,storage-api,edge-runtime,logflare,vector,supavisor,postgres-meta"]);
run(["scripts/gerar-env.mjs"]);
