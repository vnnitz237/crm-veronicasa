"use client";

import { useActionState } from "react";
import { criarNegociacao, type EstadoForm } from "@/app/(app)/negociacoes/actions";

type Opcao = { id: string; nome: string };

export function NovaNegociacaoForm({
  clienteId,
  servicos,
  unidades,
}: {
  clienteId: string;
  servicos: Opcao[];
  unidades: Opcao[];
}) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(criarNegociacao, {});
  const v = estado.valores ?? {};

  return (
    <form action={acao} className="cartao space-y-4 max-w-xl">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="servico_id" className="rotulo">Serviço *</label>
          <select id="servico_id" name="servico_id" required defaultValue={v.servico_id ?? ""} className="campo">
            <option value="" disabled>Escolha…</option>
            {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="unidade_id" className="rotulo">Unidade *</label>
          <select id="unidade_id" name="unidade_id" required defaultValue={v.unidade_id ?? ""} className="campo">
            <option value="" disabled>Escolha…</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="valor" className="rotulo">Valor (R$) *</label>
          <input id="valor" name="valor" required inputMode="decimal" placeholder="1.200,00" defaultValue={v.valor} className="campo" />
        </div>
        <div>
          <label htmlFor="data_execucao_prevista" className="rotulo">Execução prevista</label>
          <input id="data_execucao_prevista" name="data_execucao_prevista" type="date" defaultValue={v.data_execucao_prevista} className="campo" />
        </div>
      </div>
      {estado.erro && <p role="alert" className="erro">{estado.erro}</p>}
      <button type="submit" className="botao" disabled={pendente}>{pendente ? "Salvando…" : "Criar negociação"}</button>
    </form>
  );
}
