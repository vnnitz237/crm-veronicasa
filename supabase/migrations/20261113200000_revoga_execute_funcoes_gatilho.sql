-- Correção D2-04 (QA independente): funções de gatilho não precisam de EXECUTE
-- para disparar. Revoga EXECUTE de public e anon em TODAS as funções do schema
-- public que retornam trigger. Migração aditiva: as funções não são alteradas.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon', f.assinatura);
    raise notice 'EXECUTE revogado de public/anon: %', f.assinatura;
  end loop;
end;
$$;
