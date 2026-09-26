-- BlackGarage - dados de demonstração
-- 3 clientes | 1 cliente com 4 veículos | 6 ordens (vários estados)
-- URLs: /customers/bg-0, /customers/bg-1, …
-- Se a tabela já existir sem slug, corre primeiro: supabase/migrations/001-customer-slug.sql

begin;

alter table public.customers
  add column if not exists slug text;

create unique index if not exists customers_slug_unique on public.customers (slug);

-- Limpar dados de seed anteriores (IDs fixos abaixo)
delete from public.service_order_items
where order_id in (
  'a0000000-0000-4000-8000-000000000301',
  'a0000000-0000-4000-8000-000000000302',
  'a0000000-0000-4000-8000-000000000303',
  'a0000000-0000-4000-8000-000000000304',
  'a0000000-0000-4000-8000-000000000305',
  'a0000000-0000-4000-8000-000000000306'
);

delete from public.service_orders
where id in (
  'a0000000-0000-4000-8000-000000000301',
  'a0000000-0000-4000-8000-000000000302',
  'a0000000-0000-4000-8000-000000000303',
  'a0000000-0000-4000-8000-000000000304',
  'a0000000-0000-4000-8000-000000000305',
  'a0000000-0000-4000-8000-000000000306'
);

delete from public.vehicles
where id in (
  'a0000000-0000-4000-8000-000000000201',
  'a0000000-0000-4000-8000-000000000202',
  'a0000000-0000-4000-8000-000000000203',
  'a0000000-0000-4000-8000-000000000204',
  'a0000000-0000-4000-8000-000000000205',
  'a0000000-0000-4000-8000-000000000206'
);

delete from public.customers
where id in (
  'a0000000-0000-4000-8000-000000000101',
  'a0000000-0000-4000-8000-000000000102',
  'a0000000-0000-4000-8000-000000000103'
);

-- Clientes (slug = URL curta: /customers/bg-0)
insert into public.customers (id, slug, name, phone, email, notes) values
  (
    'a0000000-0000-4000-8000-000000000101',
    'bg-0',
    'Roberto Mendes',
    '915 678 901',
    'roberto.mendes@email.pt',
    'Frota - 4 veículos'
  ),
  (
    'a0000000-0000-4000-8000-000000000102',
    'bg-1',
    'Ana Paula Silva',
    '912 345 678',
    'ana.silva@email.pt',
    'Prefere contacto por WhatsApp'
  ),
  (
    'a0000000-0000-4000-8000-000000000103',
    'bg-2',
    'Carlos Eduardo Santos',
    '913 456 789',
    'carlos.santos@email.pt',
    ''
  );

-- Veículos (Roberto: 4 | restantes: 1 cada)
insert into public.vehicles (id, customer_id, plate, make, model, year) values
  (
    'a0000000-0000-4000-8000-000000000201',
    'a0000000-0000-4000-8000-000000000101',
    '12-AB-34',
    'Volkswagen',
    'Golf',
    2018
  ),
  (
    'a0000000-0000-4000-8000-000000000202',
    'a0000000-0000-4000-8000-000000000101',
    '56-CD-78',
    'Ford',
    'Transit',
    2020
  ),
  (
    'a0000000-0000-4000-8000-000000000203',
    'a0000000-0000-4000-8000-000000000101',
    '90-EF-12',
    'Renault',
    'Clio',
    2019
  ),
  (
    'a0000000-0000-4000-8000-000000000204',
    'a0000000-0000-4000-8000-000000000101',
    '34-GH-56',
    'Peugeot',
    '308',
    2021
  ),
  (
    'a0000000-0000-4000-8000-000000000205',
    'a0000000-0000-4000-8000-000000000102',
    '78-IJ-90',
    'Toyota',
    'Yaris',
    2017
  ),
  (
    'a0000000-0000-4000-8000-000000000206',
    'a0000000-0000-4000-8000-000000000103',
    '11-KL-22',
    'BMW',
    '320d',
    2016
  );

-- Ordens (6 total - estados variados)
insert into public.service_orders (
  id, customer_id, vehicle_id, status, description, created_at, updated_at
) values
  (
    'a0000000-0000-4000-8000-000000000301',
    'a0000000-0000-4000-8000-000000000101',
    'a0000000-0000-4000-8000-000000000201',
    'waiting',
    'Troca de pastilhas e discos dianteiros',
    now() - interval '2 hours',
    now() - interval '2 hours'
  ),
  (
    'a0000000-0000-4000-8000-000000000302',
    'a0000000-0000-4000-8000-000000000102',
    'a0000000-0000-4000-8000-000000000205',
    'waiting',
    'Revisão completa do sistema de travões',
    now() - interval '5 hours',
    now() - interval '5 hours'
  ),
  (
    'a0000000-0000-4000-8000-000000000303',
    'a0000000-0000-4000-8000-000000000101',
    'a0000000-0000-4000-8000-000000000202',
    'in_progress',
    'Pastilhas traseiras - Ford Transit',
    now() - interval '1 day',
    now() - interval '3 hours'
  ),
  (
    'a0000000-0000-4000-8000-000000000304',
    'a0000000-0000-4000-8000-000000000103',
    'a0000000-0000-4000-8000-000000000206',
    'in_progress',
    'Desgaste irregular - verificar pinças',
    now() - interval '2 days',
    now() - interval '1 hour'
  ),
  (
    'a0000000-0000-4000-8000-000000000305',
    'a0000000-0000-4000-8000-000000000101',
    'a0000000-0000-4000-8000-000000000203',
    'done',
    'Substituição de discos dianteiros',
    now() - interval '3 days',
    now() - interval '6 hours'
  ),
  (
    'a0000000-0000-4000-8000-000000000306',
    'a0000000-0000-4000-8000-000000000101',
    'a0000000-0000-4000-8000-000000000204',
    'delivered',
    'Purga e troca de líquido de travões',
    now() - interval '5 days',
    now() - interval '1 day'
  );

-- Itens das ordens
insert into public.service_order_items (order_id, description, quantity, unit_price) values
  ('a0000000-0000-4000-8000-000000000301', 'Pastilhas dianteiras', 1, 180),
  ('a0000000-0000-4000-8000-000000000301', 'Discos dianteiros', 2, 220),
  ('a0000000-0000-4000-8000-000000000301', 'Mão de obra', 1, 250),

  ('a0000000-0000-4000-8000-000000000302', 'Revisão travões', 1, 120),
  ('a0000000-0000-4000-8000-000000000302', 'Líquido de travões', 1, 45),

  ('a0000000-0000-4000-8000-000000000303', 'Pastilhas traseiras', 1, 150),
  ('a0000000-0000-4000-8000-000000000303', 'Mão de obra', 1, 180),

  ('a0000000-0000-4000-8000-000000000304', 'Diagnóstico pinças', 1, 80),
  ('a0000000-0000-4000-8000-000000000304', 'Reparação pinça direita', 1, 140),

  ('a0000000-0000-4000-8000-000000000305', 'Discos dianteiros', 2, 210),
  ('a0000000-0000-4000-8000-000000000305', 'Mão de obra', 1, 200),

  ('a0000000-0000-4000-8000-000000000306', 'Líquido de travões', 2, 35),
  ('a0000000-0000-4000-8000-000000000306', 'Purga do sistema', 1, 90),
  ('a0000000-0000-4000-8000-000000000306', 'Mão de obra', 1, 120);

commit;

-- Verificação
select
  (select count(*) from public.customers where id::text like 'a0000000%') as clientes,
  (select count(*) from public.vehicles where id::text like 'a0000000%') as veiculos,
  (select count(*) from public.service_orders where id::text like 'a0000000%') as ordens;
