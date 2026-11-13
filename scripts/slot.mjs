// Slot de ambiente da worktree (0 = padrão; 1–4 = pilhas isoladas para agentes paralelos).
// Origem: variável CRM_SLOT ou arquivo .crm-slot na raiz (ignorado pelo git).
import { existsSync, readFileSync } from "node:fs";

export function lerSlot() {
  const bruto = process.env.CRM_SLOT ?? (existsSync(".crm-slot") ? readFileSync(".crm-slot", "utf8").trim() : "0");
  const slot = Number(bruto);
  if (!Number.isInteger(slot) || slot < 0 || slot > 4) {
    throw new Error(`CRM_SLOT inválido: "${bruto}". Use 0 a 4.`);
  }
  return slot;
}

export const portaE2E = (slot) => 3100 + 100 * slot;
export const dirSlot = (slot) => `.local/supabase-slot${slot}`;
