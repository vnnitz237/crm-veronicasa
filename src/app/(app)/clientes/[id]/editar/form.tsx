"use client";

import { useActionState } from "react";
import { atualizarCliente, type EstadoCliente } from "../../actions";

export function EditarClienteForm({ cliente }: { cliente: Record<string, string> }) {
  const [estado, acao, pendente] = useActionState<EstadoCliente, FormData>(atualizarCliente, {});
  const v = estado.valores ?? cliente;

  return (
    <form action={acao} className="cartao space-y-4 max-w-xl" data-testid="form-editar-cliente">
      <input type="hidden" name="id" value={cliente.id} />
      <div>
        <label htmlFor="nome" className="rotulo">Nome *</label>
        <input id="nome" name="nome" required minLength={2} defaultValue={v.nome} className="campo" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="telefone" className="rotulo">Telefone (com DDD) *</label>
          <input id="telefone" name="telefone" required inputMode="tel" placeholder="(11) 90000-0000" defaultValue={v.telefone} className="campo" />
        </div>
        <div>
          <label htmlFor="email" className="rotulo">E-mail</label>
          <input id="email" name="email" type="email" defaultValue={v.email} className="campo" />
        </div>
      </div>
      <div>
        <label htmlFor="origem" className="rotulo">Origem</label>
        <select id="origem" name="origem" defaultValue={v.origem ?? ""} className="campo">
          <option value="">—</option>
          <option>Instagram</option>
          <option>WhatsApp</option>
          <option>Indicação</option>
          <option>Site</option>
          <option>Outro</option>
        </select>
      </div>
      <div>
        <label htmlFor="observacoes" className="rotulo">Observações</label>
        <textarea id="observacoes" name="observacoes" rows={3} defaultValue={v.observacoes} className="campo" />
      </div>
      {estado.erro && <p role="alert" className="erro">{estado.erro}</p>}
      <button type="submit" className="botao" disabled={pendente}>{pendente ? "Salvando…" : "Salvar alterações"}</button>
    </form>
  );
}
