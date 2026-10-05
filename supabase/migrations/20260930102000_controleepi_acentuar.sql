-- Corrige acentos conhecidos de nomes e cargos ao gravar um colaborador.

create or replace function controleepi.acentuar(p_texto text) returns text
language plpgsql
immutable
as $$
declare
  t text := p_texto;
begin
  if t is null or t = '' then
    return t;
  end if;
  t := replace(t, 'T' || chr(65533) || 'CNICO', 'TÉCNICO');
  t := replace(t, 'ARA' || chr(65533) || 'JO', 'ARAÚJO');
  t := replace(t, 'MA' || chr(65533) || 'VELY', 'MAÉVELY');
  t := regexp_replace(t, '\mFRANCA\M', 'FRANÇA', 'g');
  t := regexp_replace(t, '\mGALVAO\M', 'GALVÃO', 'g');
  t := regexp_replace(t, '\mANTONIO\M', 'ANTÔNIO', 'g');
  t := regexp_replace(t, '\mJOSE\M', 'JOSÉ', 'g');
  t := regexp_replace(t, '\mCORREA\M', 'CORRÊA', 'g');
  t := regexp_replace(t, '\mBRIGIDA\M', 'BRÍGIDA', 'g');
  t := regexp_replace(t, '\mVALERIO\M', 'VALÉRIO', 'g');
  t := regexp_replace(t, '\mDIONISIO\M', 'DIONÍSIO', 'g');
  t := regexp_replace(t, '\mARAUJO\M', 'ARAÚJO', 'g');
  t := regexp_replace(t, '\mFABRICIO\M', 'FABRÍCIO', 'g');
  t := regexp_replace(t, '\mROSARIO\M', 'ROSÁRIO', 'g');
  t := regexp_replace(t, '\mJOAO\M', 'JOÃO', 'g');
  t := regexp_replace(t, '\mJUNIOR\M', 'JÚNIOR', 'g');
  t := regexp_replace(t, '\mMARCIO\M', 'MÁRCIO', 'g');
  t := regexp_replace(t, '\mCONCEICAO\M', 'CONCEIÇÃO', 'g');
  t := regexp_replace(t, '\mJULIO\M', 'JÚLIO', 'g');
  t := regexp_replace(t, '\mMOISES\M', 'MOISÉS', 'g');
  t := regexp_replace(t, '\mVITORIA\M', 'VITÓRIA', 'g');
  t := regexp_replace(t, '\mMARILIA\M', 'MARÍLIA', 'g');
  t := regexp_replace(t, '\mTENORIO\M', 'TENÓRIO', 'g');
  t := regexp_replace(t, '\mIZIDORIO\M', 'IZIDÓRIO', 'g');
  t := regexp_replace(t, '\mANDRE\M', 'ANDRÉ', 'g');
  t := regexp_replace(t, '\mAREA\M', 'ÁREA', 'g');
  t := regexp_replace(t, '\mMAQUINAS\M', 'MÁQUINAS', 'g');
  t := regexp_replace(t, '\mCONTABIL\M', 'CONTÁBIL', 'g');
  t := regexp_replace(t, '\mTECNICO\M', 'TÉCNICO', 'g');
  return t;
end;
$$;

create or replace function controleepi.colaboradores_acentuar() returns trigger
language plpgsql
as $$
begin
  new.nome := controleepi.acentuar(new.nome);
  new.funcao := controleepi.acentuar(new.funcao);
  return new;
end;
$$;

drop trigger if exists colaboradores_acentuar on controleepi.colaboradores;
create trigger colaboradores_acentuar
before insert or update on controleepi.colaboradores
for each row execute function controleepi.colaboradores_acentuar();
