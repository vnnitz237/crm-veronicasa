"use client";

import { useActionState, useState } from "react";
import { registrarExecucao, type EstadoForm } from "../actions";

type StatusExecucao = "pendente" | "realizada" | "cancelada";

type Props = {
  id: string;
  status: StatusExecucao;
  dataPrevista: string | null;
  dataRealizada: string | null;
  motivoCancelamento: string | null;
  hoje: string;
};

export function ExecucaoForm(p: Props) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(registrarExecucao, {});
  const [status, setStatus] = useState<StatusExecucao>(p.status);

  return (
    <form action={acao} className="cartao space-y-4" data-testid="registrar-execucao">
      <h2 className="font-semibold">Registrar execução</h2>
      <input type="hidden" name="id" value={p.id} />
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="rotulo">Situação da execução</legend>
        {([
          ["pendente", "Pendente"],
          ["realizada", "Realizada"],
          ["cancelada", "Cancelada"],
        ] as const).map(([valor, rotulo]) => (
          <label key={valor} className="flex items-center gap-2">
            <input type="radio" name="status_execucao" value={valor} checked={status === valor} onChange={() => setStatus(valor)} />
            {rotulo}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="exec_data_prevista" className="rotulo">Execução prevista</label>
          <input id="exec_data_prevista" name="data_execucao_prevista" type="date" defaultValue={p.dataPrevista ?? ""} className="campo" />
        </div>
        {status === "realizada" && (
          <div>
            <label htmlFor="data_execucao_realizada" className="rotulo">Data realizada *</label>
            <input
              id="data_execucao_realizada"
              name="data_execucao_realizada"
              type="date"
              required
              defaultValue={p.dataRealizada ?? p.hoje}
              className="campo"
            />
          </div>
        )}
        {status === "cancelada" && (
          <div>
            <label htmlFor="motivo_cancelamento_execucao" className="rotulo">Motivo do cancelamento *</label>
            <input
              id="motivo_cancelamento_execucao"
              name="motivo_cancelamento_execucao"
              required
              defaultValue={p.motivoCancelamento ?? ""}
              className="campo"
            />
          </div>
        )}
      </div>

      {estado.erro && <p role="alert" className="erro">{estado.erro}</p>}
      {estado.ok && !pendente && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">Execução salva.</p>}
      <button type="submit" className="botao" disabled={pendente}>{pendente ? "Salvando…" : "Salvar execução"}</button>
    </form>
  );
}
