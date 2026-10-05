alter table controleepi.accounts add column if not exists senha_admin text;

notify pgrst, 'reload schema';
