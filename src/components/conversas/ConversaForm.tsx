"use client";

import { useActionState } from "react";
import { corrigirConversa, registrarConversa, type EstadoConversa } from "@/app/(app)/conversas/actions";
import { CANAIS_CONVERSA, ROTULO_CANAL } from "@/lib/conversas";

type Opcao = { id: string; rotulo: string };

/** Formulário de nova conversa (com `clienteId`) ou de correção (com `substituiId`). */
export function ConversaForm({
  clienteId,
  substituiId,
  negociacoes = [],
  inicial,
  testId,
}: {
  clienteId?: string;
  substituiId?: string;
  negociacoes?: Opcao[];
  inicial: Record<string, string>;
  testId: string;
}) {
  const correcao = Boolean(substituiId);
  const [estado, enviar, pendente] = useActionState<EstadoConversa, FormData>(
    correcao ? corrigirConversa : registrarConversa,
    {},
  );
  const v = estado.valores ?? inicial;

  return (
    <form action={enviar} className="cartao space-y-4 max-w-2xl" data-testid={testId}>
      {clienteId && <input type="hidden" name="cliente_id" value={clienteId} />}
      {substituiId && <input type="hidden" name="substitui_conversa_id" value={substituiId} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="canal" className="rotulo">Canal *</label>
          <select id="canal" name="canal" required defaultValue={v.canal ?? ""} className="campo">
            <option value="" disabled>Escolha…</option>
            {CANAIS_CONVERSA.map((c) => <option key={c} value={c}>{ROTULO_CANAL[c]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ocorrida_em" className="rotulo">Data e hora *</label>
          <input id="ocorrida_em" name="ocorrida_em" type="datetime-local" required defaultValue={v.ocorrida_em} className="campo" />
        </div>
        {!correcao && (
          <div className="sm:col-span-2">
            <label htmlFor="negociacao_id" className="rotulo">Negociação</label>
            <select id="negociacao_id" name="negociacao_id" defaultValue={v.negociacao_id ?? ""} className="campo">
              <option value="">Nenhuma</option>
              {negociacoes.map((n) => <option key={n.id} value={n.id}>{n.rotulo}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="conteudo" className="rotulo">Conteúdo *</label>
        <textarea id="conteudo" name="conteudo" required maxLength={20000} rows={10} defaultValue={v.conteudo} className="campo font-mono text-sm" />
      </div>
      {correcao && (
        <div>
          <label htmlFor="motivo_correcao" className="rotulo">Motivo da correção *</label>
          <input id="motivo_correcao" name="motivo_correcao" required defaultValue={v.motivo_correcao} className="campo" />
          <p className="mt-1 text-xs text-suave">A versão anterior continua guardada e visível no histórico.</p>
        </div>
      )}
      {estado.erro && <p role="alert" className="erro">{estado.erro}</p>}
      <button type="submit" className="botao" disabled={pendente}>
        {pendente ? "Salvando…" : correcao ? "Salvar correção" : "Registrar conversa"}
      </button>
    </form>
  );
}
