-- Adiciona slug curto aos clientes (URLs: /customers/bg-0)
-- Correr no SQL Editor se a tabela já existir sem slug

alter table public.customers
  add column if not exists slug text;

update public.customers
set slug = 'bg-' || sub.n::text
from (
  select id, row_number() over (order by created_at, id) - 1 as n
  from public.customers
  where slug is null
) as sub
where public.customers.id = sub.id;

alter table public.customers
  alter column slug set not null;

create unique index if not exists customers_slug_unique on public.customers (slug);
