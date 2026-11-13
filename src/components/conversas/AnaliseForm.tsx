"use client";

import { useActionState, useEffect, useRef } from "react";
import { registrarAnalise, type EstadoConversa } from "@/app/(app)/conversas/actions";

export function AnaliseForm({ conversaId }: { conversaId: string }) {
  const [estado, enviar, pendente] = useActionState<EstadoConversa, FormData>(registrarAnalise, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);

  return (
    <form ref={ref} action={enviar} className="cartao space-y-3" data-testid="nova-analise">
      <input type="hidden" name="conversa_id" value={conversaId} />
      <label htmlFor="comentario" className="rotulo">Registrar análise</label>
      <textarea id="comentario" name="comentario" required maxLength={5000} rows={3} defaultValue={estado.valores?.comentario} className="campo" />
      {estado.erro && <p role="alert" className="erro">{estado.erro}</p>}
      <button type="submit" className="botao" disabled={pendente}>{pendente ? "Salvando…" : "Registrar análise"}</button>
    </form>
  );
}
