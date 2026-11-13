import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { agruparPor, consolidar, type Grupo, type LinhaResultado } from "@/lib/relatorio";
import { deslocarMes, lerMes, mesAtual, mesParaTexto } from "@/lib/validacao";
import { formatarData, formatarMoeda, nomeDoMes } from "@/lib/formato";
import { StatusBadge } from "@/components/status";

function porcentagem(v: number | null) {
  return v === null ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function TabelaGrupo({ titulo, coluna, grupos, testId }: { titulo: string; coluna: string; grupos: Grupo[]; testId: string }) {
  return (
    <section className="cartao overflow-x-auto p-0">
      <h2 className="px-4 pt-3 font-semibold">{titulo}</h2>
      <table className="tabela" data-testid={testId}>
        <thead>
          <tr><th>{coluna}</th><th className="text-right">Fechadas</th><th className="text-right">Não fechadas</th><th className="text-right">Conversão</th><th className="text-right">Valor vendido</th></tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <tr key={g.chave}>
              <td>{g.chave}</td>
              <td className="text-right">{g.fechadas}</td>
              <td className="text-right">{g.perdidas}</td>
              <td className="text-right">{porcentagem(g.conversao)}</td>
              <td className="text-right">{formatarMoeda(g.valorVendido)}</td>
            </tr>
          ))}
          {grupos.length === 0 && <tr><td colSpan={5} className="text-center text-suave py-4">Sem resultados no mês.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

export default async function RelatorioPage({ searchParams }: PageProps<"/relatorio">) {
  const usuario = await obterUsuarioAtual();
  const { mes: mesParam } = await searchParams;
  const mes = lerMes(mesParam, mesAtual());

  const supabase = await criarClienteSupabase();
  // A função respeita a RLS: vendedor recebe só as próprias negociações; gestora recebe todas.
  const { data, error } = await supabase.rpc("negociacoes_resultado_mes", { p_ano: mes.ano, p_mes: mes.mes });
  if (error) throw new Error("Falha ao carregar o relatório.");
  const linhas = data as LinhaResultado[];
  const total = consolidar(linhas);
  const ehGestor = usuario.perfil === "gestor";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold">Relatório mensal de vendas</h1>
          <p className="text-sm text-suave" data-testid="relatorio-mes">
            {nomeDoMes(mes.ano, mes.mes)} · {ehGestor ? "todos os vendedores" : "minhas negociações"}
          </p>
        </div>
        <nav className="ml-auto flex items-center gap-2 text-sm">
          <Link href={`/relatorio?mes=${mesParaTexto(deslocarMes(mes, -1))}`} className="botao-secundario py-1">← Anterior</Link>
          <form className="flex gap-2">
            <input type="month" name="mes" defaultValue={mesParaTexto(mes)} className="campo py-1" aria-label="Mês" />
            <button className="botao-secundario py-1">Ver</button>
          </form>
          <Link href={`/relatorio?mes=${mesParaTexto(deslocarMes(mes, 1))}`} className="botao-secundario py-1">Próximo →</Link>
          <Link href={`/relatorio/execucao?mes=${mesParaTexto(mes)}`} className="botao-secundario py-1" data-testid="link-relatorio-execucao">Relatório de execução</Link>
          <a href={`/relatorio/vendas.csv?mes=${mesParaTexto(mes)}`} className="botao py-1" data-testid="exportar-csv" download>Exportar CSV</a>
        </nav>
      </div>

      <p className="text-xs text-suave">
        Critério provisório: a venda entra no mês da <strong>data da venda</strong> (fechamento); a recusa, no mês da data da recusa.
        A data de execução não altera o mês da venda.
      </p>

      <dl className="grid gap-3 sm:grid-cols-4" data-testid="indicadores">
        <div className="cartao"><dt className="text-sm text-suave">Vendas fechadas</dt><dd className="text-2xl font-semibold" data-testid="ind-fechadas">{total.fechadas}</dd></div>
        <div className="cartao"><dt className="text-sm text-suave">Valor vendido</dt><dd className="text-2xl font-semibold" data-testid="ind-valor">{formatarMoeda(total.valorVendido)}</dd></div>
        <div className="cartao"><dt className="text-sm text-suave">Não fechadas</dt><dd className="text-2xl font-semibold" data-testid="ind-perdidas">{total.perdidas}</dd></div>
        <div className="cartao"><dt className="text-sm text-suave">Conversão</dt><dd className="text-2xl font-semibold" data-testid="ind-conversao">{porcentagem(total.conversao)}</dd></div>
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        {ehGestor && <TabelaGrupo titulo="Por vendedor(a)" coluna="Vendedor(a)" grupos={agruparPor(linhas, "vendedor_nome")} testId="grupo-vendedor" />}
        <TabelaGrupo titulo="Por serviço" coluna="Serviço" grupos={agruparPor(linhas, "servico_nome")} testId="grupo-servico" />
        <TabelaGrupo titulo="Por unidade" coluna="Unidade" grupos={agruparPor(linhas, "unidade_nome")} testId="grupo-unidade" />
      </div>

      <section className="cartao overflow-x-auto p-0">
        <h2 className="px-4 pt-3 font-semibold">Negociações com resultado no mês</h2>
        <table className="tabela" data-testid="relatorio-detalhe">
          <thead>
            <tr>
              <th>Cliente</th><th>Serviço</th><th>Unidade</th>{ehGestor && <th>Vendedor(a)</th>}
              <th>Resultado</th><th>Data da venda / recusa</th><th>Execução prevista</th><th className="text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} data-negociacao-id={l.id}>
                <td><Link href={`/negociacoes/${l.id}`} className="link">{l.cliente_nome}</Link></td>
                <td>{l.servico_nome}</td>
                <td>{l.unidade_nome}</td>
                {ehGestor && <td>{l.vendedor_nome}</td>}
                <td><StatusBadge status={l.status} /></td>
                <td>{formatarData(l.data_venda ?? l.data_perda)}</td>
                <td>{formatarData(l.data_execucao_prevista)}</td>
                <td className="text-right">{formatarMoeda(l.valor)}</td>
              </tr>
            ))}
            {linhas.length === 0 && <tr><td colSpan={8} className="text-center text-suave py-6">Nenhum resultado neste mês.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
