alter table controleepi.saidas
  add column numero_ad text,
  add column motivo_ad text;

alter table controleepi.saidas
  add constraint saidas_motivo_ad_check check (motivo_ad is null or motivo_ad in ('perda', 'dano', 'extravio', 'nao_devolucao')),
  add constraint saidas_ad_par_check check ((numero_ad is null) = (motivo_ad is null)),
  add constraint saidas_numero_ad_check check (numero_ad is null or char_length(btrim(numero_ad)) between 1 and 40);

create unique index saidas_numero_ad_uk on controleepi.saidas (obra_id, numero_ad) where numero_ad is not null;

drop function controleepi.registrar_saida(uuid, uuid, uuid, uuid, date, integer);

create function controleepi.registrar_saida(
  p_company_id uuid,
  p_obra_id uuid,
  p_epi_id uuid,
  p_colaborador_id uuid,
  p_data date,
  p_quantidade integer,
  p_numero_ad text default null,
  p_motivo_ad text default null
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
  v_ad text := nullif(btrim(p_numero_ad), '');
  v_motivo text := nullif(btrim(p_motivo_ad), '');
begin
  if p_quantidade is null or p_quantidade <= 0 then
    return jsonb_build_object('ok', false, 'erro', 'Informe uma quantidade inteira maior que zero.');
  end if;
  if p_data < date '2020-01-01' or p_data > (timezone('America/Sao_Paulo', now()))::date then
    return jsonb_build_object('ok', false, 'erro', 'Use uma data entre 01/01/2020 e hoje.');
  end if;
  if (v_ad is null) <> (v_motivo is null) then
    return jsonb_build_object('ok', false, 'erro', 'Informe o número e o motivo da AD - Autorização de Desconto.');
  end if;
  if v_motivo is not null and v_motivo not in ('perda', 'dano', 'extravio', 'nao_devolucao') then
    return jsonb_build_object('ok', false, 'erro', 'Motivo da AD inválido.');
  end if;
  if v_ad is not null and char_length(v_ad) > 40 then
    return jsonb_build_object('ok', false, 'erro', 'O número da AD pode ter no máximo 40 caracteres.');
  end if;
  if v_ad is not null and exists (
    select 1 from controleepi.saidas where obra_id = p_obra_id and numero_ad = v_ad
  ) then
    return jsonb_build_object('ok', false, 'erro', 'Já existe uma AD com este número nesta obra.');
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
    valor_unitario, numero_requisicao, numero_nf, numero_ad, motivo_ad
  ) values (
    p_company_id, p_obra_id, p_epi_id, p_colaborador_id, v_entrada.id, p_data, p_quantidade,
    v_entrada.valor_unitario, v_entrada.numero_requisicao, v_entrada.numero_nf, v_ad, v_motivo
  ) returning * into v_saida;

  select validade_ca into v_ca from controleepi.epis where id = p_epi_id;
  if v_ca is not null and v_ca < p_data then
    v_aviso := 'O CA deste EPI está vencido. A entrega foi registrada mesmo assim.';
  end if;

  return jsonb_build_object('ok', true, 'aviso', v_aviso, 'id', v_saida.id);
end;
$$;

revoke all on function controleepi.registrar_saida(uuid, uuid, uuid, uuid, date, integer, text, text) from public, anon, authenticated;
grant execute on function controleepi.registrar_saida(uuid, uuid, uuid, uuid, date, integer, text, text) to service_role;

notify pgrst, 'reload schema';
