import Link from "next/link";
import { notFound } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/auth";
import { criarClienteSupabase } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/validacao";
import { formatarData } from "@/lib/formato";
import { ROTULO_TIPO_ACAO } from "@/lib/acoes";
import { SituacaoAcaoBadge } from "@/components/acoes/SituacaoAcaoBadge";
import { AtualizarAcaoForm } from "./form";

export default async function AcaoPage({ params }: PageProps<"/acoes/[id]">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const usuario = await obterUsuarioAtual();
  const supabase = await criarClienteSupabase();

  // A RLS devolve vazio para ações de outro vendedor: tratamos igual a "não existe".
  const { data: acao } = await supabase.from("vw_acoes").select("*").eq("id", id).maybeSingle();
  if (!acao) notFound();
  const ehResponsavel = usuario.perfil === "vendedor" && acao.vendedor_id === usuario.id;
  if (!ehResponsavel && usuario.perfil !== "gestor") notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/clientes/${acao.cliente_id}`} className="link text-sm">← {acao.cliente_nome}</Link>
        <h1 className="mt-1 text-xl font-semibold" data-testid="acao-titulo">
          {ROTULO_TIPO_ACAO[acao.tipo]} <SituacaoAcaoBadge situacao={acao.situacao} />
        </h1>
        <p className="text-sm text-suave">Responsável: {acao.vendedor_nome}</p>
      </div>

      <dl className="cartao grid gap-3 sm:grid-cols-3 text-sm" data-testid="acao-detalhe">
        <div><dt className="text-suave">Data prevista</dt><dd>{formatarData(acao.data_prevista)}</dd></div>
        <div><dt className="text-suave">Data realizada</dt><dd>{formatarData(acao.data_realizada)}</dd></div>
        <div>
          <dt className="text-suave">Negociação</dt>
          <dd>{acao.negociacao_id ? <Link href={`/negociacoes/${acao.negociacao_id}`} className="link">{acao.negociacao_rotulo}</Link> : "—"}</dd>
        </div>
        <div className="sm:col-span-3"><dt className="text-suave">Descrição</dt><dd className="whitespace-pre-wrap">{acao.descricao}</dd></div>
        {acao.resultado && <div className="sm:col-span-3"><dt className="text-suave">Resultado</dt><dd className="whitespace-pre-wrap">{acao.resultado}</dd></div>}
        {acao.motivo_cancelamento && <div className="sm:col-span-3"><dt className="text-suave">Motivo do cancelamento</dt><dd className="whitespace-pre-wrap">{acao.motivo_cancelamento}</dd></div>}
      </dl>

      {ehResponsavel && (
        <section className="space-y-3">
          <h2 className="font-semibold">Atualizar ação</h2>
          <AtualizarAcaoForm
            acao={{
              id: acao.id,
              situacao: acao.situacao,
              data_prevista: acao.data_prevista ?? "",
              data_realizada: acao.data_realizada ?? "",
              resultado: acao.resultado ?? "",
              motivo_cancelamento: acao.motivo_cancelamento ?? "",
            }}
          />
        </section>
      )}
    </div>
  );
}
