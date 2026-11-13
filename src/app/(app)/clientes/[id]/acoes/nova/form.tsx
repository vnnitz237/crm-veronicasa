"use client";

import { useActionState, useState } from "react";
import { criarAcao, type EstadoAcao } from "@/app/(app)/acoes/actions";
import { ROTULO_TIPO_ACAO, TIPOS_ACAO } from "@/lib/acoes";

type Opcao = { id: string; rotulo: string };

export function NovaAcaoForm({ clienteId, negociacoes, hoje }: { clienteId: string; negociacoes: Opcao[]; hoje: string }) {
  const [estado, enviar, pendente] = useActionState<EstadoAcao, FormData>(criarAcao, {});
  const v = estado.valores ?? {};
  const [situacao, setSituacao] = useState(v.situacao || "planejada");

  return (
    <form action={enviar} className="cartao space-y-4 max-w-xl" data-testid="nova-acao">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tipo" className="rotulo">Tipo *</label>
          <select id="tipo" name="tipo" required defaultValue={v.tipo ?? ""} className="campo">
            <option value="" disabled>Escolha…</option>
            {TIPOS_ACAO.map((t) => <option key={t} value={t}>{ROTULO_TIPO_ACAO[t]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="situacao" className="rotulo">Situação *</label>
          <select id="situacao" name="situacao" value={situacao} onChange={(e) => setSituacao(e.target.value)} className="campo">
            <option value="planejada">Planejada</option>
            <option value="realizada">Realizada</option>
          </select>
        </div>
        {situacao === "planejada" ? (
          <div>
            <label htmlFor="data_prevista" className="rotulo">Data prevista *</label>
            <input id="data_prevista" name="data_prevista" type="date" required defaultValue={v.data_prevista ?? hoje} className="campo" />
          </div>
        ) : (
          <div>
            <label htmlFor="data_realizada" className="rotulo">Data realizada *</label>
            <input id="data_realizada" name="data_realizada" type="date" required defaultValue={v.data_realizada ?? hoje} className="campo" />
          </div>
        )}
        <div>
          <label htmlFor="negociacao_id" className="rotulo">Negociação</label>
          <select id="negociacao_id" name="negociacao_id" defaultValue={v.negociacao_id ?? ""} className="campo">
            <option value="">Nenhuma</option>
            {negociacoes.map((n) => <option key={n.id} value={n.id}>{n.rotulo}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="descricao" className="rotulo">Descrição *</label>
        <textarea id="descricao" name="descricao" required maxLength={2000} rows={3} defaultValue={v.descricao} className="campo" />
      </div>
      {situacao === "realizada" && (
        <div>
          <label htmlFor="resultado" className="rotulo">Resultado</label>
          <textarea id="resultado" name="resultado" rows={2} defaultValue={v.resultado} className="campo" />
        </div>
      )}
      {estado.erro && <p role="alert" className="erro">{estado.erro}</p>}
      <button type="submit" className="botao" disabled={pendente}>{pendente ? "Salvando…" : "Registrar ação"}</button>
    </form>
  );
}
