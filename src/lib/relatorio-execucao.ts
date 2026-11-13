/**
 * Consolidação do relatório mensal de execução (M1, provisório H-E). Função pura.
 * As linhas vêm de `negociacoes_execucao_mes`: realizadas no mês (data realizada),
 * pendentes e canceladas com execução prevista no mês.
 * "Atrasada" é regra de tela: pendente com execução prevista anterior a hoje
 * (fuso de São Paulo). "Hoje" é recebido como parâmetro (AAAA-MM-DD).
 */
import type { Mes } from "./validacao";

export type StatusExecucao = "pendente" | "realizada" | "cancelada";
export type SituacaoExecucao = StatusExecucao | "atrasada";

export type LinhaExecucao = {
  id: string;
  cliente_nome: string;
  vendedor_id: string;
  vendedor_nome: string;
  servico_nome: string;
  unidade_nome: string;
  valor: number;
  status_execucao: StatusExecucao | null;
  data_venda: string | null;
  data_execucao_prevista: string | null;
  data_execucao_realizada: string | null;
  motivo_cancelamento_execucao: string | null;
};

export type IndicadoresExecucao = {
  realizadas: number;
  valorExecutado: number;
  /** Pendentes previstas para o mês (inclui as atrasadas). */
  pendentes: number;
  /** Subconjunto das pendentes com previsão anterior a hoje. */
  atrasadas: number;
  canceladas: number;
};

export type GrupoExecucao = IndicadoresExecucao & { vendedor_id: string; vendedor_nome: string };

function prefixoMes({ ano, mes }: Mes) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function noMes(data: string | null, mes: Mes) {
  return !!data && data.slice(0, 7) === prefixoMes(mes);
}

export function estaAtrasada(linha: Pick<LinhaExecucao, "status_execucao" | "data_execucao_prevista">, hoje: string) {
  return linha.status_execucao === "pendente" && !!linha.data_execucao_prevista && linha.data_execucao_prevista < hoje;
}

export function situacaoExecucao(
  linha: Pick<LinhaExecucao, "status_execucao" | "data_execucao_prevista">,
  hoje: string,
): SituacaoExecucao | null {
  if (!linha.status_execucao) return null;
  return estaAtrasada(linha, hoje) ? "atrasada" : linha.status_execucao;
}

/** A linha pertence ao mês segundo o critério de `negociacoes_execucao_mes`. */
export function pertenceAoMes(linha: LinhaExecucao, mes: Mes) {
  switch (linha.status_execucao) {
    case "realizada":
      return noMes(linha.data_execucao_realizada, mes);
    case "pendente":
    case "cancelada":
      return noMes(linha.data_execucao_prevista, mes);
    default:
      return false;
  }
}

function vazio(): IndicadoresExecucao {
  return { realizadas: 0, valorExecutado: 0, pendentes: 0, atrasadas: 0, canceladas: 0 };
}

function somar(acc: IndicadoresExecucao, l: LinhaExecucao, hoje: string) {
  if (l.status_execucao === "realizada") {
    acc.realizadas += 1;
    acc.valorExecutado += Number(l.valor);
  } else if (l.status_execucao === "pendente") {
    acc.pendentes += 1;
    if (estaAtrasada(l, hoje)) acc.atrasadas += 1;
  } else if (l.status_execucao === "cancelada") {
    acc.canceladas += 1;
  }
}

function arredondar(acc: IndicadoresExecucao): IndicadoresExecucao {
  return { ...acc, valorExecutado: Math.round(acc.valorExecutado * 100) / 100 };
}

export function consolidarExecucao(linhas: LinhaExecucao[], mes: Mes, hoje: string): IndicadoresExecucao {
  const acc = vazio();
  linhas.filter((l) => pertenceAoMes(l, mes)).forEach((l) => somar(acc, l, hoje));
  return arredondar(acc);
}

export function agruparExecucaoPorVendedor(linhas: LinhaExecucao[], mes: Mes, hoje: string): GrupoExecucao[] {
  const mapa = new Map<string, GrupoExecucao>();
  for (const l of linhas) {
    if (!pertenceAoMes(l, mes)) continue;
    const g = mapa.get(l.vendedor_id) ?? { vendedor_id: l.vendedor_id, vendedor_nome: l.vendedor_nome, ...vazio() };
    somar(g, l, hoje);
    mapa.set(l.vendedor_id, g);
  }
  return [...mapa.values()]
    .map((g) => ({ ...g, ...arredondar(g) }))
    .sort((a, b) => a.vendedor_nome.localeCompare(b.vendedor_nome, "pt-BR"));
}

/** Data que posiciona a linha no mês: realizada para as realizadas; prevista para as demais. */
export function dataDeReferencia(l: LinhaExecucao) {
  return l.status_execucao === "realizada" ? l.data_execucao_realizada : l.data_execucao_prevista;
}

export const ROTULO_SITUACAO_EXECUCAO: Record<SituacaoExecucao, string> = {
  pendente: "Pendente",
  atrasada: "Atrasada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};
