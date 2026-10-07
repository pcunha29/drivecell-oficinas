-- =============================================================================
-- Entrada e saída das viaturas (tempo na oficina).
--
-- service_orders.checked_in_at / checked_out_at, marcadas automaticamente:
--   entrada quando a ordem passa a "Em curso" (ou concluída/entregue, se saltar etapas);
--   saída quando passa a "Entregue" (e limpa se voltar atrás).
-- As duas podem ser corrigidas à mão na ordem (save_order recebe p_dates).
-- Ordens antigas: entrada = criação e saída = última alteração (aproximado).
-- =============================================================================

alter table public.service_orders
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_out_at timestamptz;

alter table public.service_orders
  drop constraint if exists service_orders_stay_order_check;
alter table public.service_orders
  add constraint service_orders_stay_order_check
  check (checked_out_at is null or checked_in_at is null or checked_out_at >= checked_in_at);

-- Carros na oficina agora (entrada marcada, ainda não entregues).
create index if not exists service_orders_in_workshop_idx
  on public.service_orders (workshop_id, checked_in_at)
  where checked_out_at is null and checked_in_at is not null;

-- -----------------------------------------------------------------------------
-- Histórico aproximado (sem mexer em updated_at).
-- -----------------------------------------------------------------------------

alter table public.service_orders disable trigger service_orders_updated_at;

update public.service_orders
   set checked_in_at = created_at
 where checked_in_at is null
   and status in ('in_progress', 'done', 'delivered');

update public.service_orders
   set checked_out_at = greatest(updated_at, checked_in_at)
 where checked_out_at is null
   and status = 'delivered';

alter table public.service_orders enable trigger service_orders_updated_at;

-- -----------------------------------------------------------------------------
-- Marcação automática pela mudança de estado.
-- Um valor escrito à mão (não nulo) nunca é substituído; a saída só existe nas entregues.
-- -----------------------------------------------------------------------------

create or replace function public.service_orders_track_stay()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status in ('in_progress', 'done', 'delivered') and new.checked_in_at is null then
      new.checked_in_at := case when tg_op = 'INSERT' then coalesce(new.created_at, now()) else now() end;
    end if;
    if new.status = 'delivered' and new.checked_out_at is null then
      new.checked_out_at := greatest(now(), new.checked_in_at);
    end if;
  end if;

  if new.status <> 'delivered' then
    new.checked_out_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists service_orders_track_stay on public.service_orders;
create trigger service_orders_track_stay
  before insert or update on public.service_orders
  for each row execute function public.service_orders_track_stay();

-- -----------------------------------------------------------------------------
-- save_order: igual à anterior, mais p_dates (jsonb opcional):
--   {"checkedInAt": "<iso>" | null, "checkedOutAt": "<iso>" | null}
--   chave presente = grava (null apaga); chave ausente = não mexe.
-- A assinatura muda, por isso a versão anterior é removida primeiro.
-- -----------------------------------------------------------------------------

drop function if exists public.save_order(uuid, uuid, uuid, text, text, text, boolean, jsonb);

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
                                       checked_in_at, checked_out_at)
    values (p_customer_id, p_vehicle_id, coalesce(p_status, 'waiting'),
            coalesce(p_description, ''), coalesce(p_notes, ''), coalesce(p_paid, false),
            nullif(p_dates ->> 'checkedInAt', '')::timestamptz,
            nullif(p_dates ->> 'checkedOutAt', '')::timestamptz)
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
                            else checked_out_at end
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
-- Dados de demonstração com entradas e saídas realistas.
-- Para aplicar numa oficina de demonstração existente: admin → "Repor dados".
-- -----------------------------------------------------------------------------

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
    -- Entrada: nada nas ordens em espera; nas outras, umas horas antes de a ordem ser aberta
    -- (a 7.ª, concluída, está à espera de levantamento há 9 dias, para a demo mostrar o aviso).
    -- Saída: 1 a 4 dias depois, nas entregues.
    insert into public.service_orders (workshop_id, customer_id, vehicle_id, status, paid, description, notes,
                                       created_at, updated_at, checked_in_at, checked_out_at)
    values (p_workshop_id, v_vehicle_customer[v_orders[i][1]::int], v_vehicle_ids[v_orders[i][1]::int],
            v_orders[i][2], v_orders[i][3] = 't', v_orders[i][5], v_orders[i][6], v_created, v_created,
            case
              when v_orders[i][2] = 'waiting' then null
              when i = 7 then v_created - interval '5 days'
              else v_created - make_interval(hours => (i % 3) * 4)
            end,
            case
              when v_orders[i][2] = 'delivered' then least(now(), v_created + make_interval(days => 1 + (i % 4), hours => 3))
              else null
            end)
    returning id into v_id;
    v_order_ids := v_order_ids || v_id;
  end loop;

  for i in 1 .. array_length(v_items, 1) loop
    insert into public.service_order_items (workshop_id, order_id, position, description, quantity, unit_price)
    values (p_workshop_id, v_order_ids[v_items[i][1]::int], i, v_items[i][2], v_items[i][3]::numeric, v_items[i][4]::numeric);
  end loop;

  -- Custos de exemplo em todas as linhas:
  --   peças a 55–65 % do preço de venda;
  --   mão de obra e serviços (custo da hora do mecânico) a 38–46 %.
  update public.service_order_items
     set unit_cost = case
       when description ~* '(mão de obra|diagn|inspe|revis|purga)'
         then round(unit_price * (0.38 + (position % 3) * 0.04), 2)
       else round(unit_price * (0.55 + (position % 3) * 0.05), 2)
     end
   where workshop_id = p_workshop_id;

  -- Um erro de preço de propósito (peça vendida abaixo do custo), para a demo
  -- mostrar o alerta "Vendido abaixo do custo".
  update public.service_order_items
     set unit_cost = round(unit_price * 1.08, 2)
   where id = (
     select id from public.service_order_items
      where workshop_id = p_workshop_id
        and description = 'Pastilhas dianteiras'
        and unit_price = 49
      limit 1
   );

  -- Na oficina de demonstração a opção fica ligada, para se ver a margem.
  update public.workshops set track_costs = true where id = p_workshop_id and is_demo;
end;
$$;

revoke execute on function public.seed_demo_data(uuid) from public, anon, authenticated;
grant execute on function public.seed_demo_data(uuid) to service_role;
