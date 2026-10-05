-- Controle EPI. Ao expor o schema na API, manter os schemas que já estão em produção.

create schema if not exists controleepi;

create table controleepi.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table controleepi.accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  password_changed_at timestamptz,
  failed_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table controleepi.profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references controleepi.accounts(id),
  company_id uuid not null references controleepi.companies(id),
  full_name text not null,
  email text not null,
  role text not null check (role in ('administrador', 'operador', 'cliente')),
  pode_ver_custos boolean not null default false,
  is_active boolean not null default true,
  password_changed_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table controleepi.licenses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references controleepi.accounts(id),
  company_id uuid not null references controleepi.companies(id),
  status text not null check (status in ('trial', 'active', 'cancelled', 'expired')),
  plan text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table controleepi.sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references controleepi.accounts(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table controleepi.recovery_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references controleepi.accounts(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table controleepi.password_change_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references controleepi.accounts(id),
  channel text not null check (channel in ('alterar', 'recuperar')),
  created_at timestamptz not null default now()
);

create table controleepi.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references controleepi.companies(id),
  account_id uuid references controleepi.accounts(id),
  action text not null,
  entity text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create table controleepi.error_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references controleepi.companies(id),
  account_id uuid references controleepi.accounts(id),
  tela text,
  mensagem text not null,
  created_at timestamptz not null default now()
);

create table controleepi.obras (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references controleepi.companies(id),
  nome text not null,
  data_inicio date not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table controleepi.epis (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references controleepi.companies(id),
  obra_id uuid not null references controleepi.obras(id),
  nome text not null,
  unidade text not null check (unidade in ('UN', 'PAR', 'CX', 'KG', 'M', 'L', 'SC')),
  ca text,
  validade_ca date,
  tipo_ruido text not null default 'nenhum' check (tipo_ruido in ('nenhum', 'abafador', 'plug')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table controleepi.colaboradores (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references controleepi.companies(id),
  obra_id uuid not null references controleepi.obras(id),
  nome text not null,
  matricula text not null,
  funcao text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (obra_id, matricula)
);

create table controleepi.entradas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references controleepi.companies(id),
  obra_id uuid not null references controleepi.obras(id),
  epi_id uuid not null references controleepi.epis(id),
  data date not null,
  quantidade integer not null check (quantidade > 0),
  numero_requisicao text not null,
  numero_nf text not null,
  valor_unitario numeric(12,2) not null check (valor_unitario >= 0 and valor_unitario < 10000),
  created_at timestamptz not null default now()
);

create table controleepi.saidas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references controleepi.companies(id),
  obra_id uuid not null references controleepi.obras(id),
  epi_id uuid not null references controleepi.epis(id),
  colaborador_id uuid not null references controleepi.colaboradores(id),
  entrada_id uuid not null references controleepi.entradas(id),
  data date not null,
  quantidade integer not null check (quantidade > 0),
  valor_unitario numeric(12,2) not null,
  numero_requisicao text not null,
  numero_nf text not null,
  created_at timestamptz not null default now()
);

create index entradas_epi_idx on controleepi.entradas (obra_id, epi_id, data desc, created_at desc);
create index saidas_epi_idx on controleepi.saidas (obra_id, epi_id);
create index saidas_colaborador_idx on controleepi.saidas (colaborador_id, data);

alter table controleepi.companies enable row level security;
alter table controleepi.accounts enable row level security;
alter table controleepi.profiles enable row level security;
alter table controleepi.licenses enable row level security;
alter table controleepi.sessions enable row level security;
alter table controleepi.recovery_tokens enable row level security;
alter table controleepi.password_change_log enable row level security;
alter table controleepi.audit_logs enable row level security;
alter table controleepi.error_logs enable row level security;
alter table controleepi.obras enable row level security;
alter table controleepi.epis enable row level security;
alter table controleepi.colaboradores enable row level security;
alter table controleepi.entradas enable row level security;
alter table controleepi.saidas enable row level security;

revoke all on schema controleepi from public, anon, authenticated;
revoke all on all tables in schema controleepi from public, anon, authenticated;
grant usage on schema controleepi to service_role;
grant all on all tables in schema controleepi to service_role;

create or replace function controleepi.registrar_saida(
  p_company_id uuid,
  p_obra_id uuid,
  p_epi_id uuid,
  p_colaborador_id uuid,
  p_data date,
  p_quantidade integer
) returns jsonb
language plpgsql
security definer
set search_path = controleepi
as $$
declare
  v_saldo integer;
  v_entrada controleepi.entradas%rowtype;
  v_saida controleepi.saidas%rowtype;
  v_ca date;
  v_aviso text;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    return jsonb_build_object('ok', false, 'erro', 'Informe uma quantidade inteira maior que zero.');
  end if;
  if p_data < date '2020-01-01' or p_data > (timezone('America/Sao_Paulo', now()))::date then
    return jsonb_build_object('ok', false, 'erro', 'Use uma data entre 01/01/2020 e hoje.');
  end if;

  perform 1 from controleepi.epis
  where id = p_epi_id and obra_id = p_obra_id and company_id = p_company_id and ativo
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'EPI não encontrado nesta obra.');
  end if;

  if not exists (
    select 1 from controleepi.colaboradores
    where id = p_colaborador_id and obra_id = p_obra_id and company_id = p_company_id and ativo
  ) then
    return jsonb_build_object('ok', false, 'erro', 'Colaborador não encontrado nesta obra.');
  end if;

  select * into v_entrada
  from controleepi.entradas
  where epi_id = p_epi_id and obra_id = p_obra_id and company_id = p_company_id
  order by data desc, created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Lance uma entrada com requisição, nota fiscal e valor antes de entregar.');
  end if;

  select coalesce(sum(quantidade), 0) into v_saldo from controleepi.entradas
  where epi_id = p_epi_id and obra_id = p_obra_id;
  v_saldo := v_saldo - coalesce((
    select sum(quantidade) from controleepi.saidas
    where epi_id = p_epi_id and obra_id = p_obra_id
  ), 0);

  if p_quantidade > v_saldo then
    return jsonb_build_object('ok', false, 'erro', 'A quantidade é maior que o saldo disponível.');
  end if;

  insert into controleepi.saidas (
    company_id, obra_id, epi_id, colaborador_id, entrada_id, data, quantidade,
    valor_unitario, numero_requisicao, numero_nf
  ) values (
    p_company_id, p_obra_id, p_epi_id, p_colaborador_id, v_entrada.id, p_data, p_quantidade,
    v_entrada.valor_unitario, v_entrada.numero_requisicao, v_entrada.numero_nf
  ) returning * into v_saida;

  select validade_ca into v_ca from controleepi.epis where id = p_epi_id;
  if v_ca is not null and v_ca < p_data then
    v_aviso := 'O CA deste EPI está vencido. A entrega foi registrada mesmo assim.';
  end if;

  return jsonb_build_object('ok', true, 'aviso', v_aviso, 'id', v_saida.id);
end;
$$;

revoke all on function controleepi.registrar_saida(uuid, uuid, uuid, uuid, date, integer) from public, anon, authenticated;
grant execute on function controleepi.registrar_saida(uuid, uuid, uuid, uuid, date, integer) to service_role;
