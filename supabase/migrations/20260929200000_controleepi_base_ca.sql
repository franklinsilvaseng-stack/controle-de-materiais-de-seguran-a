-- Cópia da base pública de CA do Ministério do Trabalho (arquivo tgg_export_caepi), atualizada todo dia.

create table controleepi.ca_base (
  ca text primary key,
  validade date,
  situacao text not null,
  equipamento text,
  descricao text,
  fabricante text,
  referencia text,
  atualizado_em timestamptz not null default now()
);

create table controleepi.integracoes (
  nome text primary key,
  token_hash text not null,
  ultima_execucao timestamptz,
  ultimo_total integer
);

alter table controleepi.ca_base enable row level security;
alter table controleepi.integracoes enable row level security;

revoke all on controleepi.ca_base, controleepi.integracoes from public, anon, authenticated;
grant all on controleepi.ca_base, controleepi.integracoes to service_role;

create or replace function controleepi.aplicar_base_ca(p_total integer) returns integer
language plpgsql
security definer
set search_path = controleepi
as $$
declare
  v_alterados integer;
begin
  update controleepi.epis e
  set validade_ca = b.validade, updated_at = now()
  from controleepi.ca_base b
  where ltrim(regexp_replace(coalesce(e.ca, ''), '\D', '', 'g'), '0') = b.ca
    and e.validade_ca is distinct from b.validade;
  get diagnostics v_alterados = row_count;
  update controleepi.integracoes set ultima_execucao = now(), ultimo_total = p_total where nome = 'caepi';
  return v_alterados;
end;
$$;

revoke all on function controleepi.aplicar_base_ca(integer) from public, anon, authenticated;
grant execute on function controleepi.aplicar_base_ca(integer) to service_role;
