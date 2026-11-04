-- =============================================================================
-- Marcações (calendário da oficina).
--
-- 1. workshops.calendar_enabled: mostra (ou não) o menu Marcações. Ligado por omissão;
--    só o admin (service role) o altera — os utilizadores não têm grant nesta coluna.
--    É uma opção de interface: não limita o acesso aos dados (o RLS é o de sempre).
-- 2. service_orders.expected_on / expected_time: chegada prevista do carro.
--    Aparece no calendário como marcação automática. Gravada pelo save_order (p_dates).
-- 3. appointments: marcações feitas à mão no calendário (outra cor), com tipo de serviço,
--    cliente, telefone e matrícula opcionais, e hora certa, intervalo ou sem hora.
--
-- Datas e horas são de parede (date + time, sem fuso): o que a oficina escreve é o que
-- todos veem, e a mudança de hora não desloca nada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Opção por oficina
-- -----------------------------------------------------------------------------

alter table public.workshops
  add column if not exists calendar_enabled boolean not null default true;

-- -----------------------------------------------------------------------------
-- 2. Chegada prevista nas ordens
-- -----------------------------------------------------------------------------

alter table public.service_orders
  add column if not exists expected_on date,
  add column if not exists expected_time time;

alter table public.service_orders
  drop constraint if exists service_orders_expected_check;
alter table public.service_orders
  add constraint service_orders_expected_check
  check (
    (expected_time is null or expected_on is not null)
    and (expected_on is null or expected_on between date '2000-01-01' and date '2099-12-31')
  );

create index if not exists service_orders_expected_idx
  on public.service_orders (workshop_id, expected_on)
  where expected_on is not null;

-- -----------------------------------------------------------------------------
-- 3. Marcações manuais
-- -----------------------------------------------------------------------------

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null default public.current_workshop_id()
    references public.workshops (id) on delete cascade,
  service_type text not null check (char_length(btrim(service_type)) between 1 and 80),
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 120),
  phone text not null default '' check (char_length(phone) <= 30),
  plate text not null default '' check (char_length(plate) <= 20),
  -- Ligações opcionais quando o cliente/viatura foi escolhido da lista.
  customer_id uuid,
  vehicle_id uuid,
  day date not null check (day between date '2000-01-01' and date '2099-12-31'),
  -- Sem hora (start null), hora certa (só start) ou intervalo (start + end), no mesmo dia.
  start_time time,
  end_time time,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'canceled', 'no_show')),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workshop_id),
  constraint appointments_time_check
    check (end_time is null or (start_time is not null and end_time > start_time)),
  -- Compostas: impedem ligar a um cliente/viatura de outra oficina. A lista de colunas em
  -- "set null (…)" (PG15+) evita anular também o workshop_id, que é obrigatório.
  constraint appointments_customer_fk foreign key (customer_id, workshop_id)
    references public.customers (id, workshop_id) on delete set null (customer_id),
  constraint appointments_vehicle_fk foreign key (vehicle_id, workshop_id)
    references public.vehicles (id, workshop_id) on delete set null (vehicle_id)
);

create index if not exists appointments_workshop_day_idx on public.appointments (workshop_id, day);
create index if not exists appointments_customer_idx on public.appointments (customer_id) where customer_id is not null;
create index if not exists appointments_vehicle_idx on public.appointments (vehicle_id) where vehicle_id is not null;

drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

drop trigger if exists appointments_lock_tenant on public.appointments;
create trigger appointments_lock_tenant before update on public.appointments
  for each row execute function public.lock_tenant_columns();

-- Quem criou não muda depois (e não pode ser outro utilizador ao criar).
create or replace function public.appointments_lock_created_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_lock_created_by on public.appointments;
create trigger appointments_lock_created_by before insert or update on public.appointments
  for each row execute function public.appointments_lock_created_by();

-- RLS como nas outras tabelas de negócio: ver = membro; criar/alterar/apagar = conta ativa.
alter table public.appointments enable row level security;
revoke all on public.appointments from anon;
revoke truncate, references, trigger on public.appointments from authenticated;
grant select, insert, update, delete on public.appointments to authenticated;

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
  for select to authenticated using (public.is_member(workshop_id));

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments
  for insert to authenticated with check (public.can_write(workshop_id));

drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments
  for update to authenticated
  using (public.can_write(workshop_id)) with check (public.can_write(workshop_id));

drop policy if exists appointments_delete on public.appointments;
create policy appointments_delete on public.appointments
  for delete to authenticated using (public.can_write(workshop_id));

-- -----------------------------------------------------------------------------
-- save_order: igual à anterior, com mais duas chaves em p_dates:
--   {"expectedOn": "AAAA-MM-DD" | null, "expectedTime": "HH:MM" | null}
--   chave presente = grava (null apaga); chave ausente = não mexe.
-- Mesma assinatura: os clientes antigos continuam a funcionar.
-- -----------------------------------------------------------------------------

create or replace function public.save_order(
  p_order_id uuid,
  p_customer_id uuid,
  p_vehicle_id uuid,
  p_status text,
  p_description text,
  p_notes text,
  p_paid boolean,
  p_items jsonb default null,
  p_dates jsonb default null
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
    insert into public.service_orders (customer_id, vehicle_id, status, description, notes, paid,
                                       checked_in_at, checked_out_at, expected_on, expected_time)
    values (p_customer_id, p_vehicle_id, coalesce(p_status, 'waiting'),
            coalesce(p_description, ''), coalesce(p_notes, ''), coalesce(p_paid, false),
            nullif(p_dates ->> 'checkedInAt', '')::timestamptz,
            nullif(p_dates ->> 'checkedOutAt', '')::timestamptz,
            nullif(p_dates ->> 'expectedOn', '')::date,
            nullif(p_dates ->> 'expectedTime', '')::time)
    returning id into v_id;
  else
    update public.service_orders set
      customer_id = coalesce(p_customer_id, customer_id),
      vehicle_id = coalesce(p_vehicle_id, vehicle_id),
      status = coalesce(p_status, status),
      description = coalesce(p_description, description),
      notes = coalesce(p_notes, notes),
      paid = coalesce(p_paid, paid),
      checked_in_at = case when p_dates ? 'checkedInAt'
                           then nullif(p_dates ->> 'checkedInAt', '')::timestamptz
                           else checked_in_at end,
      checked_out_at = case when p_dates ? 'checkedOutAt'
                            then nullif(p_dates ->> 'checkedOutAt', '')::timestamptz
                            else checked_out_at end,
      expected_on = case when p_dates ? 'expectedOn'
                         then nullif(p_dates ->> 'expectedOn', '')::date
                         else expected_on end,
      expected_time = case when p_dates ? 'expectedTime'
                           then nullif(p_dates ->> 'expectedTime', '')::time
                           else expected_time end
    where id = p_order_id
    returning id into v_id;

    if v_id is null then
      raise exception 'order_not_found' using errcode = 'P0002';
    end if;
  end if;

  if p_items is not null then
    delete from public.service_order_items where order_id = v_id;

    insert into public.service_order_items (workshop_id, order_id, position, description, quantity, unit_price, unit_cost)
    select o.workshop_id, v_id, (i.ord - 1)::int,
           coalesce(i.item ->> 'description', ''),
           coalesce((i.item ->> 'quantity')::numeric, 1),
           coalesce((i.item ->> 'unitPrice')::numeric, 0),
           nullif(i.item ->> 'unitCost', '')::numeric
    from jsonb_array_elements(p_items) with ordinality as i(item, ord)
    cross join (select workshop_id from public.service_orders where id = v_id) o;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_order(uuid, uuid, uuid, text, text, text, boolean, jsonb, jsonb) from public, anon;
grant execute on function public.save_order(uuid, uuid, uuid, text, text, text, boolean, jsonb, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Demonstração: a versão anterior passa a seed_demo_base (clientes, viaturas, ordens)
-- e seed_demo_data acrescenta as marcações. Assim não se copia o corpo inteiro.
-- -----------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('public.seed_demo_base(uuid)') is null then
    alter function public.seed_demo_data(uuid) rename to seed_demo_base;
  end if;
end;
$$;

revoke execute on function public.seed_demo_base(uuid) from public, anon, authenticated;
grant execute on function public.seed_demo_base(uuid) to service_role;

create or replace function public.seed_demo_data(p_workshop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Hoje na hora de Lisboa (a base de dados corre em UTC).
  v_today date := (now() at time zone 'Europe/Lisbon')::date;
  -- Segunda-feira desta semana.
  v_monday date := v_today - (extract(isodow from v_today)::int - 1);
  -- dia (a partir de segunda), início, fim, tipo, cliente, telefone, matrícula, estado
  v_appointments text[][] := array[
    ['0', '09:00', '', 'Revisão', 'Marta Figueiredo', '961 222 333', 'BG-45-TR', 'scheduled'],
    ['0', '14:00', '17:00', 'Lavagem completa', 'Transportes Lemos, Lda', '253 111 222', '44-MN-55', 'scheduled'],
    ['1', '10:30', '', 'Diagnóstico', 'Sofia Lopes', '936 444 120', '', 'scheduled'],
    ['2', '', '', 'Inspeção (IPO)', 'João Carvalho', '934 555 666', 'AX-03-QR', 'scheduled'],
    ['2', '09:00', '10:00', 'Troca de pneus', 'Rui Batista', '927 999 000', '20-UV-31', 'scheduled'],
    ['3', '11:00', '', 'Revisão', 'Paulo Antunes', '912 000 431', '', 'canceled'],
    ['4', '08:30', '12:30', 'Lavagem e polimento', 'Inês Rocha', '918 777 888', 'CZ-81-ST', 'scheduled'],
    ['7', '09:30', '', 'Pastilhas dianteiras', 'Ana Paula Silva', '912 345 678', '78-IJ-90', 'scheduled'],
    ['8', '', '', 'Ar condicionado', 'Carlos Eduardo Santos', '913 456 789', '11-KL-22', 'scheduled'],
    ['9', '15:00', '16:30', 'Lavagem completa', 'Roberto Mendes', '915 678 901', 'AA-12-BC', 'scheduled']
  ];
  i int;
begin
  perform public.seed_demo_base(p_workshop_id);

  -- As ligadas a clientes já saíram com eles; estas não estão ligadas.
  delete from public.appointments where workshop_id = p_workshop_id;

  for i in 1 .. array_length(v_appointments, 1) loop
    insert into public.appointments (workshop_id, day, start_time, end_time, service_type,
                                     customer_name, phone, plate, status, created_by)
    values (p_workshop_id,
            v_monday + v_appointments[i][1]::int,
            nullif(v_appointments[i][2], '')::time,
            nullif(v_appointments[i][3], '')::time,
            v_appointments[i][4], v_appointments[i][5], v_appointments[i][6],
            v_appointments[i][7], v_appointments[i][8], null);
  end loop;

  -- Chegada prevista nas ordens em espera: amanhã às 9h, depois de amanhã às 14h30 e
  -- daqui a 3 dias sem hora.
  with waiting as (
    select id, row_number() over (order by created_at desc, id) as n
      from public.service_orders
     where workshop_id = p_workshop_id and status = 'waiting'
  )
  update public.service_orders o
     set expected_on = v_today + w.n::int,
         expected_time = case w.n when 1 then time '09:00' when 2 then time '14:30' else null end
    from waiting w
   where o.id = w.id and w.n <= 3;
end;
$$;

revoke execute on function public.seed_demo_data(uuid) from public, anon, authenticated;
grant execute on function public.seed_demo_data(uuid) to service_role;
