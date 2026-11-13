"use client";

import { useActionState, useState } from "react";
import { atualizarAcao, type EstadoAcao } from "../actions";
import { ROTULO_SITUACAO_ACAO, SITUACOES_ACAO } from "@/lib/acoes";

export function AtualizarAcaoForm({ acao }: { acao: Record<string, string> }) {
  const [estado, enviar, pendente] = useActionState<EstadoAcao, FormData>(atualizarAcao, {});
  const v = estado.valores ?? acao;
  const [situacao, setSituacao] = useState(v.situacao);

  return (
    <form action={enviar} className="cartao space-y-4 max-w-xl" data-testid="form-atualizar-acao">
      <input type="hidden" name="id" value={acao.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="situacao" className="rotulo">Situação *</label>
          <select id="situacao" name="situacao" value={situacao} onChange={(e) => setSituacao(e.target.value)} className="campo">
            {SITUACOES_ACAO.map((s) => <option key={s} value={s}>{ROTULO_SITUACAO_ACAO[s]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="data_prevista" className="rotulo">Data prevista{situacao === "planejada" && " *"}</label>
          <input id="data_prevista" name="data_prevista" type="date" required={situacao === "planejada"} defaultValue={v.data_prevista} className="campo" />
        </div>
        {situacao === "realizada" && (
          <div>
            <label htmlFor="data_realizada" className="rotulo">Data realizada *</label>
            <input id="data_realizada" name="data_realizada" type="date" required defaultValue={v.data_realizada} className="campo" />
          </div>
        )}
      </div>
      {situacao === "cancelada" && (
        <div>
          <label htmlFor="motivo_cancelamento" className="rotulo">Motivo do cancelamento *</label>
          <textarea id="motivo_cancelamento" name="motivo_cancelamento" required rows={2} defaultValue={v.motivo_cancelamento} className="campo" />
        </div>
      )}
      <div>
        <label htmlFor="resultado" className="rotulo">Resultado</label>
        <textarea id="resultado" name="resultado" rows={3} defaultValue={v.resultado} className="campo" />
      </div>
      {estado.erro && <p role="alert" className="erro">{estado.erro}</p>}
      <button type="submit" className="botao" disabled={pendente}>{pendente ? "Salvando…" : "Salvar ação"}</button>
    </form>
  );
}
