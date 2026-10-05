alter table controleepi.entradas
  add column ca text,
  add column marca text;

alter table controleepi.entradas
  add constraint entradas_ca_check check (ca is null or char_length(btrim(ca)) between 1 and 40),
  add constraint entradas_marca_check check (marca is null or char_length(btrim(marca)) between 1 and 80);

notify pgrst, 'reload schema';
