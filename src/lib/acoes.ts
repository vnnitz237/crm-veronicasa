/**
 * Ações comerciais — consolidação do mês (hipótese provisória H-A).
 * Planejadas, realizadas e canceladas são contadas SEPARADAMENTE: a função
 * `acoes_mes` devolve as realizadas pela data realizada e as planejadas/canceladas
 * pela data prevista, então cada ação entra em uma única situação.
 */
export type TipoAcao = "ligacao" | "mensagem" | "visita" | "proposta" | "follow_up" | "outro";
export type SituacaoAcao = "planejada" | "realizada" | "cancelada";

export const TIPOS_ACAO: TipoAcao[] = ["ligacao", "mensagem", "visita", "proposta", "follow_up", "outro"];
export const SITUACOES_ACAO: SituacaoAcao[] = ["planejada", "realizada", "cancelada"];

export const ROTULO_TIPO_ACAO: Record<TipoAcao, string> = {
  ligacao: "Ligação",
  mensagem: "Mensagem",
  visita: "Visita",
  proposta: "Proposta",
  follow_up: "Follow-up",
  outro: "Outro",
};

export const ROTULO_SITUACAO_ACAO: Record<SituacaoAcao, string> = {
  planejada: "Planejada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export function ehTipoAcao(v: unknown): v is TipoAcao {
  return typeof v === "string" && (TIPOS_ACAO as string[]).includes(v);
}
export function ehSituacaoAcao(v: unknown): v is SituacaoAcao {
  return typeof v === "string" && (SITUACOES_ACAO as string[]).includes(v);
}

export type LinhaAcao = {
  id: string;
  tipo: TipoAcao;
  situacao: SituacaoAcao;
  vendedor_id: string;
  vendedor_nome: string;
};

export type TotaisAcao = { planejadas: number; realizadas: number; canceladas: number; total: number };
export type GrupoAcao = TotaisAcao & { chave: string; rotulo: string };

function vazio(): TotaisAcao {
  return { planejadas: 0, realizadas: 0, canceladas: 0, total: 0 };
}

function somar(t: TotaisAcao, s: SituacaoAcao) {
  if (s === "planejada") t.planejadas++;
  else if (s === "realizada") t.realizadas++;
  else t.canceladas++;
  t.total++;
}

export function totaisAcoes(linhas: LinhaAcao[]): TotaisAcao {
  const t = vazio();
  for (const l of linhas) somar(t, l.situacao);
  return t;
}

/** Por tipo, na ordem fixa dos tipos, só os que aparecem. */
export function acoesPorTipo(linhas: LinhaAcao[]): GrupoAcao[] {
  return TIPOS_ACAO.map((tipo) => {
    const g: GrupoAcao = { chave: tipo, rotulo: ROTULO_TIPO_ACAO[tipo], ...vazio() };
    for (const l of linhas) if (l.tipo === tipo) somar(g, l.situacao);
    return g;
  }).filter((g) => g.total > 0);
}

/** Por responsável (vendedor_id), ordenado pelo nome. */
export function acoesPorResponsavel(linhas: LinhaAcao[]): GrupoAcao[] {
  const mapa = new Map<string, GrupoAcao>();
  for (const l of linhas) {
    let g = mapa.get(l.vendedor_id);
    if (!g) {
      g = { chave: l.vendedor_id, rotulo: l.vendedor_nome, ...vazio() };
      mapa.set(l.vendedor_id, g);
    }
    somar(g, l.situacao);
  }
  return [...mapa.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}
