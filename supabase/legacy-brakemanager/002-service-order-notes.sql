-- Notas internas na folha de serviço (separadas de description)
alter table public.service_orders
  add column if not exists notes text not null default '';
