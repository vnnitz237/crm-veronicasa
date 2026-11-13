"use client";

import { useActionState, useState } from "react";
import { registrarResultado, type EstadoForm } from "../actions";

type Props = {
  id: string;
  status: "em_negociacao" | "fechou" | "nao_fechou";
  dataVenda: string | null;
  dataPerda: string | null;
  motivoPerda: string | null;
  dataExecucaoPrevista: string | null;
  hoje: string;
};

export function ResultadoForm(p: Props) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(registrarResultado, {});
  const [status, setStatus] = useState(p.status);

  return (
    <form action={acao} className="cartao space-y-4">
      <h2 className="font-semibold">Registrar resultado</h2>
      <input type="hidden" name="id" value={p.id} />
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="rotulo">O cliente fechou?</legend>
        {([
          ["em_negociacao", "Ainda em negociação"],
          ["fechou", "Fechou"],
          ["nao_fechou", "Não fechou"],
        ] as const).map(([valor, rotulo]) => (
          <label key={valor} className="flex items-center gap-2">
            <input type="radio" name="status" value={valor} checked={status === valor} onChange={() => setStatus(valor)} />
            {rotulo}
          </label>
        ))}
      </fieldset>

      {status === "fechou" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="data_venda" className="rotulo">Data da venda *</label>
            <input id="data_venda" name="data_venda" type="date" required defaultValue={p.dataVenda ?? p.hoje} className="campo" />
          </div>
          <div>
            <label htmlFor="data_execucao_prevista" className="rotulo">Execução prevista</label>
            <input id="data_execucao_prevista" name="data_execucao_prevista" type="date" defaultValue={p.dataExecucaoPrevista ?? ""} className="campo" />
          </div>
        </div>
      )}

      {status === "nao_fechou" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="data_perda" className="rotulo">Data da recusa *</label>
            <input id="data_perda" name="data_perda" type="date" required defaultValue={p.dataPerda ?? p.hoje} className="campo" />
          </div>
          <div>
            <label htmlFor="motivo_perda" className="rotulo">Motivo *</label>
            <select id="motivo_perda" name="motivo_perda" required defaultValue={p.motivoPerda ?? ""} className="campo">
              <option value="" disabled>Escolha…</option>
              <option>Preço</option>
              <option>Agenda / horário</option>
              <option>Escolheu concorrente</option>
              <option>Sem resposta</option>
              <option>Outro</option>
            </select>
          </div>
        </div>
      )}

      {estado.erro && <p role="alert" className="erro">{estado.erro}</p>}
      {estado.ok && !pendente && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">Resultado salvo.</p>}
      <button type="submit" className="botao" disabled={pendente}>{pendente ? "Salvando…" : "Salvar resultado"}</button>
    </form>
  );
}
