import Link from "next/link";
import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { consolidarPainel, type LinhaAcaoPainel } from "@/lib/painel";
import type { LinhaResultado } from "@/lib/relatorio";
import type { LinhaExecucao } from "@/lib/relatorio-execucao";
import { deslocarMes, hojeISO, lerMes, mesAtual, mesParaTexto } from "@/lib/validacao";
import { formatarMoeda, nomeDoMes } from "@/lib/formato";

function porcentagem(v: number | null) {
  return v === null ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** Início do mês em São Paulo (sem horário de verão desde 2019: UTC−3). */
function inicioDoMes({ ano, mes }: { ano: number; mes: number }) {
  return `${ano}-${String(mes).padStart(2, "0")}-01T00:00:00-03:00`;
}

function Card({ titulo, href, testId, children }: { titulo: string; href: string; testId: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="cartao block space-y-1 hover:ring-2 hover:ring-current/20" data-testid={testId}>
      <h2 className="text-sm text-suave">{titulo}</h2>
      {children}
      <p className="text-xs link">Ver detalhe →</p>
    </Link>
  );
}

export default async function PainelPage({ searchParams }: PageProps<"/painel">) {
  const usuario = await obterUsuarioAtual();
  if (usuario.perfil !== "gestor") notFound();

  const { mes: mesParam } = await searchParams;
  const mes = lerMes(mesParam, mesAtual());
  const texto = mesParaTexto(mes);
  const hoje = hojeISO();
  const args = { p_ano: mes.ano, p_mes: mes.mes };

  const supabase = await criarClienteSupabase();
  const [vendas, execucoes, acoes, conversas] = await Promise.all([
    supabase.rpc("negociacoes_resultado_mes", args),
    supabase.rpc("negociacoes_execucao_mes", args),
    supabase.rpc("acoes_mes", args).select("vendedor_id, vendedor_nome, situacao"),
    supabase
      .from("vw_conversas")
      .select("id", { count: "exact", head: true })
      .eq("versao_atual", true)
      .gte("ocorrida_em", inicioDoMes(mes))
      .lt("ocorrida_em", inicioDoMes(deslocarMes(mes, 1))),
  ]);
  if (vendas.error || execucoes.error || acoes.error || conversas.error) throw new Error("Falha ao carregar o painel.");

  const p = consolidarPainel(
    {
      vendas: vendas.data as LinhaResultado[],
      execucoes: execucoes.data as LinhaExecucao[],
      acoes: acoes.data as LinhaAcaoPainel[],
      conversas: conversas.count ?? 0,
    },
    mes,
    hoje,
  );

  return (
    <div className="space-y-6" data-testid="painel">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold">Painel gerencial</h1>
          <p className="text-sm text-suave" data-testid="painel-mes">{nomeDoMes(mes.ano, mes.mes)} · todos os vendedores</p>
        </div>
        <nav className="ml-auto flex items-center gap-2 text-sm">
          <Link href={`/painel?mes=${mesParaTexto(deslocarMes(mes, -1))}`} className="botao-secundario py-1">← Anterior</Link>
          <form className="flex gap-2">
            <input type="month" name="mes" defaultValue={texto} className="campo py-1" aria-label="Mês" />
            <button className="botao-secundario py-1">Ver</button>
          </form>
          <Link href={`/painel?mes=${mesParaTexto(deslocarMes(mes, 1))}`} className="botao-secundario py-1">Próximo →</Link>
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card titulo="Vendas fechadas" href={`/relatorio?mes=${texto}`} testId="card-vendas">
          <p className="text-2xl font-semibold">{p.vendas.fechadas}</p>
          <p className="text-sm">{formatarMoeda(p.vendas.valorVendido)} · conversão {porcentagem(p.vendas.conversao)}</p>
        </Card>
        <Card titulo="Execuções realizadas" href={`/relatorio/execucao?mes=${texto}`} testId="card-execucoes">
          <p className="text-2xl font-semibold">{p.execucoes.realizadas}</p>
          <p className="text-sm">{p.execucoes.pendentes} pendentes · {p.execucoes.atrasadas} atrasadas</p>
        </Card>
        <Card titulo="Ações realizadas" href={`/acoes?mes=${texto}`} testId="card-acoes">
          <p className="text-2xl font-semibold">{p.acoes.realizadas}</p>
          <p className="text-sm">{p.acoes.planejadas} planejadas</p>
        </Card>
        <Card titulo="Conversas registradas" href={`/conversas?mes=${texto}`} testId="card-conversas">
          <p className="text-2xl font-semibold">{p.conversas}</p>
          <p className="text-sm">no mês</p>
        </Card>
      </div>

      <section className="cartao overflow-x-auto p-0">
        <h2 className="px-4 pt-3 font-semibold">Por vendedor(a)</h2>
        <table className="tabela" data-testid="painel-por-vendedor">
          <thead>
            <tr>
              <th>Vendedor(a)</th><th className="text-right">Vendas</th><th className="text-right">Valor</th>
              <th className="text-right">Ações realizadas</th><th className="text-right">Execuções realizadas</th>
            </tr>
          </thead>
          <tbody>
            {p.porVendedor.map((l) => (
              <tr key={l.vendedor_id}>
                <td>{l.vendedor_nome}</td>
                <td className="text-right">{l.vendas}</td>
                <td className="text-right">{formatarMoeda(l.valor)}</td>
                <td className="text-right">{l.acoesRealizadas}</td>
                <td className="text-right">{l.execucoesRealizadas}</td>
              </tr>
            ))}
            {p.porVendedor.length === 0 && <tr><td colSpan={5} className="text-center text-suave py-6">Sem movimento no mês.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
