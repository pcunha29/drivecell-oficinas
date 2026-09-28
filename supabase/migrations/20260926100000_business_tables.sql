-- Tabelas de negócio multi-tenant: clientes, viaturas, ordens de reparação e linhas.
-- Cada linha pertence a uma oficina (workshop_id). Ao inserir a partir da app,
-- workshop_id é preenchido automaticamente com a oficina do utilizador.
-- Depende de 20260925120000_workshops.sql (workshops, is_member, can_write,
-- current_workshop_id).

-- ---------------------------------------------------------------------------
-- Oficinas: campos de gestão (só a service role/admin altera)
-- ---------------------------------------------------------------------------

alter table public.workshops
  add column if not exists is_demo boolean not null default false,
  add column if not exists admin_notes text not null default '';

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null default public.current_workshop_id()
    references public.workshops (id) on delete cascade,
  slug text not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, slug),
  unique (id, workshop_id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null default public.current_workshop_id()
    references public.workshops (id) on delete cascade,
  customer_id uuid not null,
  plate text not null check (char_length(btrim(plate)) between 1 and 20),
  make text not null default '',
  model text not null default '',
  year int check (year is null or year between 1900 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, plate),
  unique (id, workshop_id),
  -- Composta: impede ligar a viatura a um cliente de outra oficina.
  foreign key (customer_id, workshop_id)
    references public.customers (id, workshop_id) on delete cascade
);

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null default public.current_workshop_id()
    references public.workshops (id) on delete cascade,
  customer_id uuid not null,
  vehicle_id uuid not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'in_progress', 'done', 'delivered')),
  description text not null default '',
  notes text not null default '',
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workshop_id),
  foreign key (customer_id, workshop_id)
    references public.customers (id, workshop_id) on delete cascade,
  foreign key (vehicle_id, workshop_id)
    references public.vehicles (id, workshop_id) on delete cascade
);

create table public.service_order_items (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null default public.current_workshop_id()
    references public.workshops (id) on delete cascade,
  order_id uuid not null,
  position int not null default 0,
  description text not null default '',
  quantity numeric(10, 2) not null default 1 check (quantity >= 0),
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now(),
  foreign key (order_id, workshop_id)
    references public.service_orders (id, workshop_id) on delete cascade
);

create index customers_workshop_idx on public.customers (workshop_id);
create index vehicles_workshop_idx on public.vehicles (workshop_id);
create index vehicles_customer_idx on public.vehicles (customer_id);
create index service_orders_workshop_idx on public.service_orders (workshop_id, created_at desc);
create index service_orders_customer_idx on public.service_orders (customer_id);
create index service_orders_vehicle_idx on public.service_orders (vehicle_id);
create index service_order_items_order_idx on public.service_order_items (order_id, position);

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger service_orders_updated_at before update on public.service_orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Slug do cliente (c-1, c-2, …) por oficina, sem corridas.
-- security definer porque os utilizadores não podem alterar workshops.customer_seq.
-- ---------------------------------------------------------------------------

create or replace function public.assign_customer_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq int;
begin
  if new.slug is null or new.slug = '' then
    update public.workshops
      set customer_seq = customer_seq + 1
      where id = new.workshop_id
      returning customer_seq into v_seq;
    new.slug := 'c-' || v_seq;
  end if;
  return new;
end;
$$;

create trigger customers_assign_slug before insert on public.customers
  for each row execute function public.assign_customer_slug();

-- O slug e a oficina não mudam depois de criados.
create or replace function public.lock_tenant_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.workshop_id is distinct from old.workshop_id then
    raise exception 'workshop_id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger customers_lock_tenant before update on public.customers
  for each row execute function public.lock_tenant_columns();
create trigger vehicles_lock_tenant before update on public.vehicles
  for each row execute function public.lock_tenant_columns();
create trigger service_orders_lock_tenant before update on public.service_orders
  for each row execute function public.lock_tenant_columns();

-- ---------------------------------------------------------------------------
-- RLS: ver = membro; criar/alterar/apagar = membro com conta ativa (can_write)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['customers', 'vehicles', 'service_orders', 'service_order_items']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_member(workshop_id))',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_write(workshop_id))',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_write(workshop_id)) with check (public.can_write(workshop_id))',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_write(workshop_id))',
      t || '_delete', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: gravar uma ordem e as suas linhas numa só transação.
-- security invoker: o RLS aplica-se normalmente.
-- p_items null = não mexe nas linhas; [] = remove todas.
-- ---------------------------------------------------------------------------

create or replace function public.save_order(
  p_order_id uuid,
  p_customer_id uuid,
  p_vehicle_id uuid,
  p_status text,
  p_description text,
  p_notes text,
  p_paid boolean,
  p_items jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_order_id is null then
    insert into public.service_orders (customer_id, vehicle_id, status, description, notes, paid)
    values (p_customer_id, p_vehicle_id, coalesce(p_status, 'waiting'),
            coalesce(p_description, ''), coalesce(p_notes, ''), coalesce(p_paid, false))
    returning id into v_id;
  else
    update public.service_orders set
      customer_id = coalesce(p_customer_id, customer_id),
      vehicle_id = coalesce(p_vehicle_id, vehicle_id),
      status = coalesce(p_status, status),
      description = coalesce(p_description, description),
      notes = coalesce(p_notes, notes),
      paid = coalesce(p_paid, paid)
    where id = p_order_id
    returning id into v_id;

    if v_id is null then
      raise exception 'order_not_found' using errcode = 'P0002';
    end if;
  end if;

  if p_items is not null then
    delete from public.service_order_items where order_id = v_id;

    insert into public.service_order_items (workshop_id, order_id, position, description, quantity, unit_price)
    select o.workshop_id, v_id, (i.ord - 1)::int,
           coalesce(i.item ->> 'description', ''),
           coalesce((i.item ->> 'quantity')::numeric, 1),
           coalesce((i.item ->> 'unitPrice')::numeric, 0)
    from jsonb_array_elements(p_items) with ordinality as i(item, ord)
    cross join (select workshop_id from public.service_orders where id = v_id) o;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_order(uuid, uuid, uuid, text, text, text, boolean, jsonb) from public, anon;
grant execute on function public.save_order(uuid, uuid, uuid, text, text, text, boolean, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Dados de demonstração
-- seed_demo_data(ws): apaga os dados da oficina e carrega um conjunto realista.
-- Só a service role (página de admin) a chama diretamente.
-- ---------------------------------------------------------------------------

create or replace function public.seed_demo_data(p_workshop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customers text[][] := array[
    ['Roberto Mendes', '915 678 901', 'roberto.mendes@exemplo.pt', 'Frota da empresa - 3 viaturas'],
    ['Ana Paula Silva', '912 345 678', 'ana.silva@exemplo.pt', 'Prefere contacto por WhatsApp'],
    ['Carlos Eduardo Santos', '913 456 789', 'carlos.santos@exemplo.pt', ''],
    ['Marta Figueiredo', '961 222 333', 'marta.figueiredo@exemplo.pt', 'Vem sempre ao sábado de manhã'],
    ['Transportes Lemos, Lda', '253 111 222', 'oficina@transporteslemos.pt', 'Faturar à empresa - NIF na ficha'],
    ['João Carvalho', '934 555 666', 'joao.carvalho@exemplo.pt', ''],
    ['Inês Rocha', '918 777 888', 'ines.rocha@exemplo.pt', 'Carro de substituição quando possível'],
    ['Rui Batista', '927 999 000', 'rui.batista@exemplo.pt', '']
  ];
  -- cliente (índice 1-based), matrícula, marca, modelo, ano
  v_vehicles text[][] := array[
    ['1', 'AA-12-BC', 'Volkswagen', 'Golf', '2018'],
    ['1', '56-CD-78', 'Ford', 'Transit', '2020'],
    ['1', '90-EF-12', 'Renault', 'Clio', '2019'],
    ['2', '78-IJ-90', 'Toyota', 'Yaris', '2017'],
    ['3', '11-KL-22', 'BMW', '320d', '2016'],
    ['4', 'BG-45-TR', 'Peugeot', '208', '2021'],
    ['5', '44-MN-55', 'Mercedes-Benz', 'Sprinter', '2019'],
    ['5', '66-OP-77', 'Mercedes-Benz', 'Vito', '2022'],
    ['6', 'AX-03-QR', 'Seat', 'Leon', '2015'],
    ['7', 'CZ-81-ST', 'Renault', 'Mégane', '2020'],
    ['8', '20-UV-31', 'Fiat', 'Punto', '2012']
  ];
  -- viatura (índice), estado, pago, dias atrás, descrição, notas
  v_orders text[][] := array[
    ['1', 'waiting', 'f', '0', 'Troca de pastilhas e discos dianteiros', 'Cliente deixa o carro amanhã às 9h'],
    ['4', 'waiting', 'f', '1', 'Revisão completa do sistema de travões', ''],
    ['10', 'waiting', 'f', '1', 'Ruído na suspensão dianteira', 'Verificar casquilhos'],
    ['2', 'in_progress', 'f', '2', 'Pastilhas traseiras', 'Peças encomendadas - chegam hoje'],
    ['5', 'in_progress', 'f', '3', 'Desgaste irregular - verificar pinças', ''],
    ['7', 'in_progress', 'f', '2', 'Revisão dos 60 000 km', ''],
    ['3', 'done', 'f', '4', 'Substituição de discos dianteiros', 'Avisar cliente por telefone'],
    ['9', 'done', 't', '5', 'Mudança de óleo e filtros', ''],
    ['6', 'delivered', 't', '6', 'Purga e troca de líquido de travões', ''],
    ['8', 'delivered', 'f', '8', 'Pastilhas e sensores de desgaste', 'Faturar no fim do mês'],
    ['11', 'delivered', 't', '12', 'Inspeção pré-IPO', ''],
    ['1', 'delivered', 't', '20', 'Mudança de óleo e filtros', ''],
    ['4', 'delivered', 't', '34', 'Pastilhas dianteiras', ''],
    ['7', 'delivered', 't', '41', 'Discos e pastilhas dianteiros', ''],
    ['2', 'delivered', 't', '55', 'Revisão geral', ''],
    ['10', 'delivered', 't', '63', 'Substituição de amortecedores traseiros', ''],
    ['5', 'delivered', 't', '78', 'Pinça traseira direita', ''],
    ['8', 'delivered', 't', '92', 'Revisão dos 40 000 km', ''],
    ['6', 'delivered', 't', '104', 'Pastilhas dianteiras', ''],
    ['3', 'delivered', 't', '121', 'Líquido de travões e escovas', ''],
    ['9', 'delivered', 't', '139', 'Embraiagem', ''],
    ['11', 'delivered', 't', '150', 'Mudança de óleo e filtros', '']
  ];
  -- ordem (índice), descrição, quantidade, preço unitário
  v_items text[][] := array[
    ['1', 'Pastilhas dianteiras', '1', '58'], ['1', 'Discos dianteiros', '2', '64'], ['1', 'Mão de obra', '1.5', '35'],
    ['2', 'Revisão travões', '1', '45'], ['2', 'Líquido de travões DOT4', '1', '14'],
    ['3', 'Diagnóstico', '1', '30'],
    ['4', 'Pastilhas traseiras', '1', '72'], ['4', 'Mão de obra', '1', '35'],
    ['5', 'Diagnóstico pinças', '1', '30'], ['5', 'Kit reparação pinça', '1', '48'], ['5', 'Mão de obra', '2', '35'],
    ['6', 'Óleo 5W30 (litro)', '6', '9.5'], ['6', 'Filtro de óleo', '1', '14'], ['6', 'Filtro de ar', '1', '22'], ['6', 'Mão de obra', '1.5', '35'],
    ['7', 'Discos dianteiros', '2', '71'], ['7', 'Mão de obra', '1.5', '35'],
    ['8', 'Óleo 5W40 (litro)', '5', '8.5'], ['8', 'Filtro de óleo', '1', '12'], ['8', 'Mão de obra', '0.5', '35'],
    ['9', 'Líquido de travões DOT4', '2', '14'], ['9', 'Purga do sistema', '1', '40'],
    ['10', 'Pastilhas dianteiras', '1', '64'], ['10', 'Sensores de desgaste', '2', '18'], ['10', 'Mão de obra', '1', '35'],
    ['11', 'Inspeção pré-IPO', '1', '35'],
    ['12', 'Óleo 5W30 (litro)', '5', '9.5'], ['12', 'Filtro de óleo', '1', '14'], ['12', 'Mão de obra', '0.5', '35'],
    ['13', 'Pastilhas dianteiras', '1', '52'], ['13', 'Mão de obra', '1', '35'],
    ['14', 'Discos dianteiros', '2', '88'], ['14', 'Pastilhas dianteiras', '1', '79'], ['14', 'Mão de obra', '2', '35'],
    ['15', 'Revisão geral', '1', '180'], ['15', 'Filtros', '1', '46'],
    ['16', 'Amortecedores traseiros', '2', '95'], ['16', 'Mão de obra', '2.5', '35'],
    ['17', 'Pinça traseira recondicionada', '1', '120'], ['17', 'Mão de obra', '1.5', '35'],
    ['18', 'Revisão 40 000 km', '1', '210'],
    ['19', 'Pastilhas dianteiras', '1', '49'], ['19', 'Mão de obra', '1', '35'],
    ['20', 'Líquido de travões DOT4', '1', '14'], ['20', 'Escovas', '2', '16'], ['20', 'Mão de obra', '0.5', '35'],
    ['21', 'Kit embraiagem', '1', '285'], ['21', 'Mão de obra', '5', '35'],
    ['22', 'Óleo 5W40 (litro)', '4', '8.5'], ['22', 'Filtro de óleo', '1', '11'], ['22', 'Mão de obra', '0.5', '35']
  ];
  v_customer_ids uuid[] := '{}';
  v_vehicle_ids uuid[] := '{}';
  v_order_ids uuid[] := '{}';
  v_vehicle_customer uuid[] := '{}';
  v_id uuid;
  i int;
  v_created timestamptz;
begin
  if not exists (select 1 from public.workshops where id = p_workshop_id) then
    raise exception 'workshop_not_found' using errcode = 'P0002';
  end if;

  -- Limpa (as FKs em cascata tratam de viaturas, ordens e linhas).
  delete from public.customers where workshop_id = p_workshop_id;
  update public.workshops set customer_seq = 0 where id = p_workshop_id;

  for i in 1 .. array_length(v_customers, 1) loop
    insert into public.customers (workshop_id, slug, name, phone, email, notes, created_at)
    values (p_workshop_id, '', v_customers[i][1], v_customers[i][2], v_customers[i][3], v_customers[i][4],
            now() - make_interval(days => 160 - i))
    returning id into v_id;
    v_customer_ids := v_customer_ids || v_id;
  end loop;

  for i in 1 .. array_length(v_vehicles, 1) loop
    insert into public.vehicles (workshop_id, customer_id, plate, make, model, year)
    values (p_workshop_id, v_customer_ids[v_vehicles[i][1]::int], v_vehicles[i][2], v_vehicles[i][3],
            v_vehicles[i][4], v_vehicles[i][5]::int)
    returning id into v_id;
    v_vehicle_ids := v_vehicle_ids || v_id;
    v_vehicle_customer := v_vehicle_customer || v_customer_ids[v_vehicles[i][1]::int];
  end loop;

  for i in 1 .. array_length(v_orders, 1) loop
    v_created := date_trunc('hour', now()) - make_interval(days => v_orders[i][4]::int, hours => (i % 5));
    insert into public.service_orders (workshop_id, customer_id, vehicle_id, status, paid, description, notes, created_at, updated_at)
    values (p_workshop_id, v_vehicle_customer[v_orders[i][1]::int], v_vehicle_ids[v_orders[i][1]::int],
            v_orders[i][2], v_orders[i][3] = 't', v_orders[i][5], v_orders[i][6], v_created, v_created)
    returning id into v_id;
    v_order_ids := v_order_ids || v_id;
  end loop;

  for i in 1 .. array_length(v_items, 1) loop
    insert into public.service_order_items (workshop_id, order_id, position, description, quantity, unit_price)
    values (p_workshop_id, v_order_ids[v_items[i][1]::int], i, v_items[i][2], v_items[i][3]::numeric, v_items[i][4]::numeric);
  end loop;
end;
$$;

revoke execute on function public.seed_demo_data(uuid) from public, anon, authenticated;
grant execute on function public.seed_demo_data(uuid) to service_role;

-- Onboarding: o próprio utilizador pode carregar exemplos na sua oficina vazia.
create or replace function public.load_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid := public.current_workshop_id();
begin
  if v_ws is null or not public.can_write(v_ws) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if exists (select 1 from public.customers where workshop_id = v_ws) then
    raise exception 'workshop_not_empty' using errcode = '23505';
  end if;
  perform public.seed_demo_data(v_ws);
end;
$$;

revoke execute on function public.load_demo_data() from public, anon;
grant execute on function public.load_demo_data() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: criar oficina para um utilizador já existente (usado pela página de
-- admin, com a service role, depois de convidar o dono por email).
-- ---------------------------------------------------------------------------

create or replace function public.admin_create_workshop(
  p_owner_id uuid,
  p_name text,
  p_phone text default null,
  p_nif text default null,
  p_status text default 'trialing',
  p_trial_days int default 14,
  p_is_demo boolean default false
)
returns public.workshops
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workshop public.workshops;
begin
  insert into public.workshops (name, phone, nif, subscription_status, trial_ends_at, is_demo)
  values (btrim(p_name), nullif(btrim(coalesce(p_phone, '')), ''),
          nullif(regexp_replace(coalesce(p_nif, ''), '\s', '', 'g'), ''),
          p_status, now() + make_interval(days => greatest(p_trial_days, 0)), p_is_demo)
  returning * into v_workshop;

  insert into public.workshop_members (workshop_id, user_id, role)
  values (v_workshop.id, p_owner_id, 'owner');

  if p_is_demo then
    perform public.seed_demo_data(v_workshop.id);
  end if;

  return v_workshop;
end;
$$;

revoke execute on function public.admin_create_workshop(uuid, text, text, text, text, int, boolean) from public, anon, authenticated;
grant execute on function public.admin_create_workshop(uuid, text, text, text, text, int, boolean) to service_role;
