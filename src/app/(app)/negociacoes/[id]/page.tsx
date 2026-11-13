import Link from "next/link";
import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehUuid, hojeISO } from "@/lib/validacao";
import { formatarData, formatarMoeda, ROTULO_STATUS } from "@/lib/formato";
import { StatusBadge } from "@/components/status";
import { ROTULO_SITUACAO_EXECUCAO, situacaoExecucao } from "@/lib/relatorio-execucao";
import { ResultadoForm } from "./resultado-form";
import { ExecucaoForm } from "./execucao-form";

const ROTULO_CAMPO: Record<string, string> = {
  criada: "Negociação criada",
  status: "Status",
  valor: "Valor",
  servico_id: "Serviço",
  unidade_id: "Unidade",
  data_venda: "Data da venda",
  data_perda: "Data da recusa",
  motivo_perda: "Motivo",
  data_execucao_prevista: "Execução prevista",
  status_execucao: "Situação da execução",
  data_execucao_realizada: "Execução realizada em",
  motivo_cancelamento_execucao: "Motivo do cancelamento da execução",
};

function descreverValor(campo: string, valor: string | null) {
  if (valor === null) return "—";
  if (campo === "status_execucao") return ROTULO_SITUACAO_EXECUCAO[valor as keyof typeof ROTULO_SITUACAO_EXECUCAO] ?? valor;
  if (campo === "status" || campo === "criada") return ROTULO_STATUS[valor as keyof typeof ROTULO_STATUS] ?? valor;
  if (campo.startsWith("data_")) return formatarData(valor);
  if (campo === "valor") return formatarMoeda(Number(valor));
  return valor;
}

export default async function NegociacaoPage({ params }: PageProps<"/negociacoes/[id]">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const usuario = await obterUsuarioAtual();
  const supabase = await criarClienteSupabase();

  // RLS: negociação de outro vendedor volta vazia, inclusive por URL direta.
  const { data: n } = await supabase.from("vw_negociacoes").select("*").eq("id", id).maybeSingle();
  if (!n || !n.id || !n.status) notFound();

  const { data: historico } = await supabase
    .from("historico_negociacoes")
    .select("id, campo, valor_anterior, valor_novo, alterado_em, autor:perfis(nome)")
    .eq("negociacao_id", id)
    .order("alterado_em", { ascending: false })
    .order("id", { ascending: false });

  const podeEditar = usuario.perfil === "vendedor" && n.vendedor_id === usuario.id;
  const hoje = hojeISO();
  const situacao = situacaoExecucao(n, hoje);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/clientes/${n.cliente_id}`} className="link text-sm">← {n.cliente_nome}</Link>
        <h1 className="mt-1 text-xl font-semibold" data-testid="negociacao-titulo">
          {n.servico_nome} · {n.unidade_nome}
        </h1>
        <p className="text-sm text-suave">Vendedor(a): {n.vendedor_nome}</p>
      </div>

      <dl className="cartao grid gap-3 sm:grid-cols-3 text-sm" data-testid="negociacao-dados">
        <div><dt className="text-suave">Cliente</dt><dd>{n.cliente_nome}</dd></div>
        <div><dt className="text-suave">Serviço</dt><dd>{n.servico_nome}</dd></div>
        <div><dt className="text-suave">Unidade</dt><dd>{n.unidade_nome}</dd></div>
        <div><dt className="text-suave">Valor</dt><dd>{formatarMoeda(n.valor ?? 0)}</dd></div>
        <div><dt className="text-suave">Status</dt><dd data-testid="negociacao-status"><StatusBadge status={n.status} /></dd></div>
        <div><dt className="text-suave">Data da venda</dt><dd data-testid="negociacao-data-venda">{formatarData(n.data_venda)}</dd></div>
        <div><dt className="text-suave">Execução prevista</dt><dd>{formatarData(n.data_execucao_prevista)}</dd></div>
        {n.status === "nao_fechou" && (
          <>
            <div><dt className="text-suave">Data da recusa</dt><dd>{formatarData(n.data_perda)}</dd></div>
            <div><dt className="text-suave">Motivo</dt><dd>{n.motivo_perda}</dd></div>
          </>
        )}
      </dl>

      {podeEditar && (
        <ResultadoForm
          id={n.id}
          status={n.status}
          dataVenda={n.data_venda}
          dataPerda={n.data_perda}
          motivoPerda={n.motivo_perda}
          dataExecucaoPrevista={n.data_execucao_prevista}
          hoje={hoje}
        />
      )}

      {n.status === "fechou" && (
        <section className="space-y-2" data-testid="execucao">
          <h2 className="font-semibold">Execução</h2>
          <dl className="cartao grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-suave">Situação</dt>
              <dd data-testid="execucao-status" data-status={situacao ?? ""}>{situacao ? ROTULO_SITUACAO_EXECUCAO[situacao] : "—"}</dd>
            </div>
            <div><dt className="text-suave">Prevista</dt><dd data-testid="execucao-prevista">{formatarData(n.data_execucao_prevista)}</dd></div>
            <div><dt className="text-suave">Realizada</dt><dd data-testid="execucao-realizada">{formatarData(n.data_execucao_realizada)}</dd></div>
            {n.status_execucao === "cancelada" && (
              <div className="sm:col-span-3"><dt className="text-suave">Motivo do cancelamento</dt><dd>{n.motivo_cancelamento_execucao}</dd></div>
            )}
          </dl>
          {podeEditar && n.status_execucao && (
            <ExecucaoForm
              id={n.id}
              status={n.status_execucao}
              dataPrevista={n.data_execucao_prevista}
              dataRealizada={n.data_execucao_realizada}
              motivoCancelamento={n.motivo_cancelamento_execucao}
              hoje={hoje}
            />
          )}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Histórico</h2>
        <ul className="cartao space-y-2 text-sm">
          {(historico ?? []).map((h) => (
            <li key={h.id}>
              <span className="text-suave">{new Date(h.alterado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
              {" · "}{h.autor?.nome ?? "Sistema"}{" · "}
              <strong>{ROTULO_CAMPO[h.campo] ?? h.campo}</strong>
              {h.campo === "criada"
                ? ` (${descreverValor(h.campo, h.valor_novo)})`
                : `: ${descreverValor(h.campo, h.valor_anterior)} → ${descreverValor(h.campo, h.valor_novo)}`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
