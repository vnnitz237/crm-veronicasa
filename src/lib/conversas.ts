/** Conversas (hipótese provisória H-C): rótulos, datas e cadeia de versões. */
export type CanalConversa = "whatsapp" | "instagram" | "telefone" | "email" | "presencial" | "outro";

export const CANAIS_CONVERSA: CanalConversa[] = ["whatsapp", "instagram", "telefone", "email", "presencial", "outro"];

export const ROTULO_CANAL: Record<CanalConversa, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  telefone: "Telefone",
  email: "E-mail",
  presencial: "Presencial",
  outro: "Outro",
};

export function ehCanal(v: unknown): v is CanalConversa {
  return typeof v === "string" && (CANAIS_CONVERSA as string[]).includes(v);
}

const FUSO = "America/Sao_Paulo";

/**
 * Lê o valor de um <input type="datetime-local"> ("AAAA-MM-DDTHH:MM") como horário
 * de São Paulo e devolve ISO com offset fixo -03:00 (sem horário de verão desde 2019).
 */
export function lerDataHoraLocal(valor: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor);
  if (!m) return null;
  const [, a, mes, d, h, min] = m.map(Number);
  const dt = new Date(Date.UTC(a, mes - 1, d, h, min));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== mes - 1 || dt.getUTCDate() !== d || h > 23 || min > 59) {
    return null;
  }
  return `${valor}:00-03:00`;
}

/** timestamptz -> "AAAA-MM-DDTHH:MM" em São Paulo (para preencher datetime-local). */
export function paraDataHoraLocal(iso: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** timestamptz -> "DD/MM/AAAA HH:MM" em São Paulo. */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [data, hora] = paraDataHoraLocal(iso).split("T");
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a} ${hora}`;
}

/** "AAAA-MM-DD" (dia em São Paulo) -> limite ISO do início do dia. */
export function inicioDoDia(data: string): string {
  return `${data}T00:00:00-03:00`;
}

type Versao = { id: string; substitui_conversa_id: string | null };

/**
 * Monta a cadeia de versões que contém `id`, da mais antiga para a mais nova.
 * Recebe todas as versões do mesmo cliente (cada versão é substituída no máximo uma vez).
 */
export function cadeiaDeVersoes<T extends Versao>(versoes: T[], id: string): T[] {
  const porId = new Map(versoes.map((v) => [v.id, v]));
  const sucessor = new Map<string, T>();
  for (const v of versoes) if (v.substitui_conversa_id) sucessor.set(v.substitui_conversa_id, v);

  let atual = porId.get(id);
  if (!atual) return [];
  const vistos = new Set<string>([atual.id]);
  while (atual.substitui_conversa_id && porId.has(atual.substitui_conversa_id) && !vistos.has(atual.substitui_conversa_id)) {
    atual = porId.get(atual.substitui_conversa_id)!;
    vistos.add(atual.id);
  }
  const cadeia: T[] = [atual];
  let prox = sucessor.get(atual.id);
  while (prox && !cadeia.includes(prox)) {
    cadeia.push(prox);
    prox = sucessor.get(prox.id);
  }
  return cadeia;
}

/** "AAAA-MM-DD" (dia em São Paulo) -> último instante do dia. */
export function fimDoDia(data: string): string {
  return `${data}T23:59:59.999-03:00`;
}
