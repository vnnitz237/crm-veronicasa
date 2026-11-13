/**
 * Consolidação do relatório mensal de vendas.
 * Hipótese provisória H3: o mês de uma venda é o mês da DATA DA VENDA (fechamento);
 * o mês de uma perda é o mês da data da perda. A data de execução não entra aqui.
 */
export type LinhaResultado = {
  id: string;
  cliente_nome: string;
  vendedor_id: string;
  vendedor_nome: string;
  servico_nome: string;
  unidade_nome: string;
  valor: number;
  status: "em_negociacao" | "fechou" | "nao_fechou";
  data_venda: string | null;
  data_perda: string | null;
  data_execucao_prevista: string | null;
};

export type Indicadores = {
  fechadas: number;
  perdidas: number;
  valorVendido: number;
  /** fechadas / (fechadas + perdidas); null quando não houve resultado. */
  conversao: number | null;
  ticketMedio: number | null;
};

export type Grupo = Indicadores & { chave: string };

function vazio(): Omit<Indicadores, "conversao" | "ticketMedio"> {
  return { fechadas: 0, perdidas: 0, valorVendido: 0 };
}

function finalizar(base: Omit<Indicadores, "conversao" | "ticketMedio">): Indicadores {
  const encerradas = base.fechadas + base.perdidas;
  return {
    ...base,
    valorVendido: Math.round(base.valorVendido * 100) / 100,
    conversao: encerradas ? base.fechadas / encerradas : null,
    ticketMedio: base.fechadas ? Math.round((base.valorVendido / base.fechadas) * 100) / 100 : null,
  };
}

function somar(acc: Omit<Indicadores, "conversao" | "ticketMedio">, linha: LinhaResultado) {
  if (linha.status === "fechou") {
    acc.fechadas += 1;
    acc.valorVendido += Number(linha.valor);
  } else if (linha.status === "nao_fechou") {
    acc.perdidas += 1;
  }
}

export function consolidar(linhas: LinhaResultado[]): Indicadores {
  const acc = vazio();
  linhas.forEach((l) => somar(acc, l));
  return finalizar(acc);
}

export function agruparPor(
  linhas: LinhaResultado[],
  campo: "vendedor_nome" | "servico_nome" | "unidade_nome",
): Grupo[] {
  const mapa = new Map<string, ReturnType<typeof vazio>>();
  for (const linha of linhas) {
    const chave = linha[campo];
    const acc = mapa.get(chave) ?? vazio();
    somar(acc, linha);
    mapa.set(chave, acc);
  }
  return [...mapa.entries()]
    .map(([chave, acc]) => ({ chave, ...finalizar(acc) }))
    .sort((a, b) => b.valorVendido - a.valorVendido || a.chave.localeCompare(b.chave, "pt-BR"));
}
