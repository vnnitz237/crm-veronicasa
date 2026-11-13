/**
 * Consolidação do painel gerencial (M6). Função pura.
 * Reaproveita `consolidar` (vendas) e `consolidarExecucao` (execuções).
 */
import { consolidar, type Indicadores, type LinhaResultado } from "./relatorio";
import { consolidarExecucao, pertenceAoMes, type IndicadoresExecucao, type LinhaExecucao } from "./relatorio-execucao";
import type { Mes } from "./validacao";

export type LinhaAcaoPainel = {
  vendedor_id: string;
  vendedor_nome: string;
  situacao: "planejada" | "realizada" | "cancelada";
};

export type EntradaPainel = {
  vendas: LinhaResultado[];
  execucoes: LinhaExecucao[];
  acoes: LinhaAcaoPainel[];
  /** Conversas (versões atuais) com `ocorrida_em` no mês. */
  conversas: number;
};

export type LinhaPainelVendedor = {
  vendedor_id: string;
  vendedor_nome: string;
  vendas: number;
  valor: number;
  acoesRealizadas: number;
  execucoesRealizadas: number;
};

export type Painel = {
  vendas: Indicadores;
  execucoes: IndicadoresExecucao;
  acoes: { realizadas: number; planejadas: number; canceladas: number };
  conversas: number;
  porVendedor: LinhaPainelVendedor[];
};

export function consolidarPainel(e: EntradaPainel, mes: Mes, hoje: string): Painel {
  const acoes = { realizadas: 0, planejadas: 0, canceladas: 0 };
  for (const a of e.acoes) {
    if (a.situacao === "realizada") acoes.realizadas += 1;
    else if (a.situacao === "planejada") acoes.planejadas += 1;
    else if (a.situacao === "cancelada") acoes.canceladas += 1;
  }

  const mapa = new Map<string, LinhaPainelVendedor>();
  const linha = (id: string, nome: string) => {
    let l = mapa.get(id);
    if (!l) {
      l = { vendedor_id: id, vendedor_nome: nome, vendas: 0, valor: 0, acoesRealizadas: 0, execucoesRealizadas: 0 };
      mapa.set(id, l);
    }
    return l;
  };
  for (const v of e.vendas) {
    const l = linha(v.vendedor_id, v.vendedor_nome);
    if (v.status === "fechou") {
      l.vendas += 1;
      l.valor += Number(v.valor);
    }
  }
  for (const a of e.acoes) {
    const l = linha(a.vendedor_id, a.vendedor_nome);
    if (a.situacao === "realizada") l.acoesRealizadas += 1;
  }
  for (const x of e.execucoes) {
    if (x.status_execucao !== "realizada" || !pertenceAoMes(x, mes)) continue;
    linha(x.vendedor_id, x.vendedor_nome).execucoesRealizadas += 1;
  }

  return {
    vendas: consolidar(e.vendas),
    execucoes: consolidarExecucao(e.execucoes, mes, hoje),
    acoes,
    conversas: e.conversas,
    porVendedor: [...mapa.values()]
      .map((l) => ({ ...l, valor: Math.round(l.valor * 100) / 100 }))
      .sort((a, b) => b.valor - a.valor || a.vendedor_nome.localeCompare(b.vendedor_nome, "pt-BR")),
  };
}
