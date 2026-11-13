import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { deslocarMes, lerMes, mesAtual, mesParaTexto } from "@/lib/validacao";
import { formatarData, nomeDoMes } from "@/lib/formato";
import { acoesPorResponsavel, acoesPorTipo, ROTULO_TIPO_ACAO, totaisAcoes, type GrupoAcao } from "@/lib/acoes";
import { SituacaoAcaoBadge } from "@/components/acoes/SituacaoAcaoBadge";

function TabelaGrupo({ titulo, coluna, grupos, testId }: { titulo: string; coluna: string; grupos: GrupoAcao[]; testId: string }) {
  return (
    <section className="cartao overflow-x-auto p-0">
      <h2 className="px-4 pt-3 font-semibold">{titulo}</h2>
      <table className="tabela" data-testid={testId}>
        <thead>
          <tr><th>{coluna}</th><th className="text-right">Planejadas</th><th className="text-right">Realizadas</th><th className="text-right">Canceladas</th></tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <tr key={g.chave}>
              <td>{g.rotulo}</td>
              <td className="text-right">{g.planejadas}</td>
              <td className="text-right">{g.realizadas}</td>
              <td className="text-right">{g.canceladas}</td>
            </tr>
          ))}
          {grupos.length === 0 && <tr><td colSpan={4} className="text-center text-suave py-4">Sem ações no mês.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

export default async function AcoesPage({ searchParams }: PageProps<"/acoes">) {
  const usuario = await obterUsuarioAtual();
  const { mes: mesParam } = await searchParams;
  const mes = lerMes(mesParam, mesAtual());

  const supabase = await criarClienteSupabase();
  // A função respeita a RLS: vendedor recebe só as próprias; gestora, todas.
  const { data, error } = await supabase.rpc("acoes_mes", { p_ano: mes.ano, p_mes: mes.mes });
  if (error) throw new Error("Falha ao carregar as ações do mês.");
  const linhas = [...(data ?? [])].sort((a, b) =>
    (a.data_realizada ?? a.data_prevista ?? "").localeCompare(b.data_realizada ?? b.data_prevista ?? ""),
  );
  const total = totaisAcoes(linhas);
  const ehGestor = usuario.perfil === "gestor";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold">Ações do mês</h1>
          <p className="text-sm text-suave" data-testid="acoes-mes">
            {nomeDoMes(mes.ano, mes.mes)} · {ehGestor ? "todos os vendedores" : "minhas ações"}
          </p>
        </div>
        <nav className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <Link href={`/acoes?mes=${mesParaTexto(deslocarMes(mes, -1))}`} className="botao-secundario py-1">← Anterior</Link>
          <form className="flex flex-wrap gap-2">
            <input type="month" name="mes" defaultValue={mesParaTexto(mes)} className="campo py-1" aria-label="Mês" />
            <button className="botao-secundario py-1">Ver</button>
          </form>
          <Link href={`/acoes?mes=${mesParaTexto(deslocarMes(mes, 1))}`} className="botao-secundario py-1">Próximo →</Link>
        </nav>
      </div>

      <p className="text-xs text-suave">
        Critério provisório: a ação <strong>realizada</strong> entra no mês da data em que foi realizada; a <strong>planejada</strong> e a{" "}
        <strong>cancelada</strong>, no mês da data prevista. Canceladas são contadas à parte.
      </p>

      <dl className="grid gap-3 sm:grid-cols-3" data-testid="indicadores-acoes">
        <div className="cartao"><dt className="text-sm text-suave">Planejadas</dt><dd className="text-2xl font-semibold" data-testid="ind-acoes-planejadas">{total.planejadas}</dd></div>
        <div className="cartao"><dt className="text-sm text-suave">Realizadas</dt><dd className="text-2xl font-semibold" data-testid="ind-acoes-realizadas">{total.realizadas}</dd></div>
        <div className="cartao"><dt className="text-sm text-suave">Canceladas</dt><dd className="text-2xl font-semibold" data-testid="ind-acoes-canceladas">{total.canceladas}</dd></div>
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        {ehGestor && <TabelaGrupo titulo="Por responsável" coluna="Responsável" grupos={acoesPorResponsavel(linhas)} testId="acoes-por-responsavel" />}
        <TabelaGrupo titulo="Por tipo" coluna="Tipo" grupos={acoesPorTipo(linhas)} testId="acoes-por-tipo" />
      </div>

      <section className="cartao overflow-x-auto p-0">
        <h2 className="px-4 pt-3 font-semibold">Ações no mês</h2>
        <table className="tabela" data-testid="lista-acoes">
          <thead>
            <tr>
              <th>Data</th><th>Situação</th><th>Tipo</th><th>Cliente</th>
              {ehGestor && <th>Responsável</th>}
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/acoes/${a.id}`} className="link">{formatarData(a.situacao === "realizada" ? a.data_realizada : a.data_prevista)}</Link></td>
                <td><SituacaoAcaoBadge situacao={a.situacao} /></td>
                <td>{ROTULO_TIPO_ACAO[a.tipo]}</td>
                <td><Link href={`/clientes/${a.cliente_id}`} className="link">{a.cliente_nome}</Link></td>
                {ehGestor && <td>{a.vendedor_nome}</td>}
                <td className="max-w-md truncate">{a.descricao}</td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr><td colSpan={ehGestor ? 6 : 5} className="text-center text-suave py-6">Nenhuma ação no mês.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
