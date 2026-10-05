alter table controleepi.epis
  add column validade_na boolean not null default false;

create or replace function controleepi.aplicar_base_ca(p_total integer) returns integer
language plpgsql
security definer
set search_path = controleepi
as $$
declare
  v_alterados integer;
begin
  update controleepi.epis e
  set validade_ca = b.validade, validade_na = false, updated_at = now()
  from controleepi.ca_base b
  where ltrim(regexp_replace(coalesce(e.ca, ''), '\D', '', 'g'), '0') = b.ca
    and e.ca is distinct from 'N/A'
    and (e.validade_ca is distinct from b.validade or e.validade_na);
  get diagnostics v_alterados = row_count;
  update controleepi.integracoes set ultima_execucao = now(), ultimo_total = p_total where nome = 'caepi';
  return v_alterados;
end;
$$;

revoke all on function controleepi.aplicar_base_ca(integer) from public, anon, authenticated;
grant execute on function controleepi.aplicar_base_ca(integer) to service_role;

notify pgrst, 'reload schema';
