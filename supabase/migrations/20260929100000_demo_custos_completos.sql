-- =============================================================================
-- Dados de demonstração com custo em todas as linhas (peças e mão de obra),
-- incluindo uma peça vendida abaixo do custo para a demo mostrar o alerta.
-- Para aplicar numa oficina de demonstração existente: admin → "Repor dados".
-- =============================================================================

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
