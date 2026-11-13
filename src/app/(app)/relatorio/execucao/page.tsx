import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import {
  consolidarExecucao,
  dataDeReferencia,
  pertenceAoMes,
  ROTULO_SITUACAO_EXECUCAO,
  situacaoExecucao,
  type LinhaExecucao,
} from "@/lib/relatorio-execucao";
import { deslocarMes, hojeISO, lerMes, mesAtual, mesParaTexto } from "@/lib/validacao";
import { formatarData, formatarMoeda, nomeDoMes } from "@/lib/formato";

export default async function RelatorioExecucaoPage({ searchParams }: PageProps<"/relatorio/execucao">) {
  const usuario = await obterUsuarioAtual();
  const { mes: mesParam } = await searchParams;
  const mes = lerMes(mesParam, mesAtual());
  const hoje = hojeISO();

  const supabase = await criarClienteSupabase();
  // RLS: vendedor recebe só as próprias negociações; gestora recebe todas.
  const { data, error } = await supabase.rpc("negociacoes_execucao_mes", { p_ano: mes.ano, p_mes: mes.mes });
  if (error) throw new Error("Falha ao carregar o relatório de execução.");
  const linhas = (data as LinhaExecucao[])
    .filter((l) => pertenceAoMes(l, mes))
    .sort((a, b) => (dataDeReferencia(a) ?? "").localeCompare(dataDeReferencia(b) ?? ""));
  const total = consolidarExecucao(linhas, mes, hoje);
  const ehGestor = usuario.perfil === "gestor";
  const texto = mesParaTexto(mes);

  return (
    <div className="space-y-6" data-testid="relatorio-execucao">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold">Relatório mensal de execução</h1>
          <p className="text-sm text-suave" data-testid="relatorio-mes">
            {nomeDoMes(mes.ano, mes.mes)} · {ehGestor ? "todos os vendedores" : "minhas negociações"}
          </p>
        </div>
        <nav className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <Link href={`/relatorio/execucao?mes=${mesParaTexto(deslocarMes(mes, -1))}`} className="botao-secundario py-1">← Anterior</Link>
          <form className="flex gap-2">
            <input type="month" name="mes" defaultValue={texto} className="campo py-1" aria-label="Mês" />
            <button className="botao-secundario py-1">Ver</button>
          </form>
          <Link href={`/relatorio/execucao?mes=${mesParaTexto(deslocarMes(mes, 1))}`} className="botao-secundario py-1">Próximo →</Link>
          <Link href={`/relatorio?mes=${texto}`} className="botao-secundario py-1">Relatório de vendas</Link>
          <a href={`/relatorio/execucao.csv?mes=${texto}`} className="botao py-1" data-testid="exportar-csv-execucao" download>Exportar CSV</a>
        </nav>
      </div>

      <p className="text-xs text-suave">
        Critério provisório: a execução realizada entra no mês da <strong>data realizada</strong>; a pendente e a cancelada,
        no mês da <strong>execução prevista</strong>. Atrasada = pendente com previsão anterior a hoje ({formatarData(hoje)}).
        Pendentes sem data prevista não aparecem aqui.
      </p>

      <dl className="grid gap-3 sm:grid-cols-4" data-testid="indicadores-execucao">
        <div className="cartao">
          <dt className="text-sm text-suave">Realizadas</dt>
          <dd className="text-2xl font-semibold" data-testid="ind-realizadas">{total.realizadas}</dd>
          <dd className="text-sm text-suave" data-testid="ind-valor-executado">{formatarMoeda(total.valorExecutado)} executados</dd>
        </div>
        <div className="cartao"><dt className="text-sm text-suave">Pendentes previstas no mês</dt><dd className="text-2xl font-semibold" data-testid="ind-pendentes">{total.pendentes}</dd></div>
        <div className="cartao"><dt className="text-sm text-suave">Atrasadas</dt><dd className="text-2xl font-semibold" data-testid="ind-atrasadas">{total.atrasadas}</dd></div>
        <div className="cartao"><dt className="text-sm text-suave">Canceladas</dt><dd className="text-2xl font-semibold" data-testid="ind-canceladas">{total.canceladas}</dd></div>
      </dl>

      <section className="cartao overflow-x-auto p-0">
        <h2 className="px-4 pt-3 font-semibold">Execuções do mês</h2>
        <table className="tabela" data-testid="relatorio-execucao-detalhe">
          <thead>
            <tr>
              <th>Cliente</th><th>Serviço</th><th>Unidade</th>{ehGestor && <th>Vendedor(a)</th>}
              <th>Situação</th><th>Prevista</th><th>Realizada</th><th>Motivo do cancelamento</th><th className="text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const s = situacaoExecucao(l, hoje);
              return (
                <tr key={l.id} data-negociacao-id={l.id} data-situacao={s ?? ""}>
                  <td><Link href={`/negociacoes/${l.id}`} className="link">{l.cliente_nome}</Link></td>
                  <td>{l.servico_nome}</td>
                  <td>{l.unidade_nome}</td>
                  {ehGestor && <td>{l.vendedor_nome}</td>}
                  <td>{s ? ROTULO_SITUACAO_EXECUCAO[s] : "—"}</td>
                  <td>{formatarData(l.data_execucao_prevista)}</td>
                  <td>{formatarData(l.data_execucao_realizada)}</td>
                  <td>{l.motivo_cancelamento_execucao ?? ""}</td>
                  <td className="text-right">{formatarMoeda(Number(l.valor))}</td>
                </tr>
              );
            })}
            {linhas.length === 0 && <tr><td colSpan={9} className="text-center text-suave py-6">Nenhuma execução neste mês.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
