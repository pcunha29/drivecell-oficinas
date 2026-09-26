-- Oficinas (tenants), membros e onboarding.
-- Uma oficina por utilizador, por agora (garantido em create_workshop).

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  phone text,
  nif text check (nif is null or nif ~ '^\d{9}$'),
  customer_seq int not null default 0,
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz not null default now() + interval '7 days',
  current_period_end timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.workshop_members (
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  primary key (workshop_id, user_id)
);

-- A PK começa por workshop_id; as políticas filtram por user_id.
create index workshop_members_user_id_idx on public.workshop_members (user_id);

alter table public.workshops enable row level security;
alter table public.workshop_members enable row level security;

-- ---------------------------------------------------------------------------
-- Funções auxiliares (usadas nas políticas desta e das próximas tabelas)
-- security definer: leem workshop_members sem passar pelo RLS (evita recursão).
-- ---------------------------------------------------------------------------

create or replace function public.is_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workshop_members m
    where m.workshop_id = ws
      and m.user_id = (select auth.uid())
  );
$$;

-- Pode criar/alterar registos: membro e subscrição ativa, teste a decorrer
-- ou pagamento em atraso (período de tolerância até a Stripe cancelar).
-- Caso contrário a conta fica só-leitura.
create or replace function public.can_write(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workshops w
    join public.workshop_members m on m.workshop_id = w.id
    where w.id = ws
      and m.user_id = (select auth.uid())
      and (
        w.subscription_status in ('active', 'past_due')
        or (w.subscription_status = 'trialing' and w.trial_ends_at > now())
      )
  );
$$;

create or replace function public.current_workshop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.workshop_id
  from public.workshop_members m
  where m.user_id = (select auth.uid())
  order by (m.role = 'owner') desc, m.workshop_id
  limit 1;
$$;

revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.can_write(uuid) from public, anon;
revoke execute on function public.current_workshop_id() from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.can_write(uuid) to authenticated;
grant execute on function public.current_workshop_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas
-- Inserções (oficina + membro) só via create_workshop. Campos de faturação
-- (subscription_status, trial_ends_at, stripe_*) só via service role.
-- ---------------------------------------------------------------------------

create policy "workshops_select_members"
  on public.workshops for select
  to authenticated
  using (public.is_member(id));

create policy "workshops_update_owners"
  on public.workshops for update
  to authenticated
  using (
    exists (
      select 1
      from public.workshop_members m
      where m.workshop_id = workshops.id
        and m.user_id = (select auth.uid())
        and m.role = 'owner'
    )
  )
  with check (
    exists (
      select 1
      from public.workshop_members m
      where m.workshop_id = workshops.id
        and m.user_id = (select auth.uid())
        and m.role = 'owner'
    )
  );

create policy "workshop_members_select_own"
  on public.workshop_members for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.workshops from anon, authenticated;
revoke insert, update, delete on public.workshop_members from anon, authenticated;
grant update (name, phone, nif) on public.workshops to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: criar a oficina (onboarding)
-- Erros (mensagem lida pela UI): not_authenticated, invalid_name,
-- invalid_nif, terms_required, workshop_exists.
-- ---------------------------------------------------------------------------

create or replace function public.create_workshop(
  p_name text,
  p_phone text default null,
  p_nif text default null
)
returns public.workshops
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_nif text := nullif(regexp_replace(coalesce(p_nif, ''), '\s', '', 'g'), '');
  v_meta jsonb;
  v_terms_version text;
  v_terms_accepted_at timestamptz;
  v_workshop public.workshops;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if char_length(v_name) not between 2 and 80 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  if v_nif is not null and v_nif !~ '^\d{9}$' then
    raise exception 'invalid_nif' using errcode = '22023';
  end if;

  if v_phone is not null and char_length(v_phone) > 32 then
    v_phone := left(v_phone, 32);
  end if;

  -- Serializa pedidos simultâneos do mesmo utilizador (duplo clique, dois separadores).
  perform pg_advisory_xact_lock(hashtextextended('create_workshop:' || v_uid::text, 0));

  if exists (select 1 from public.workshop_members m where m.user_id = v_uid) then
    raise exception 'workshop_exists' using errcode = '23505';
  end if;

  select u.raw_user_meta_data into v_meta from auth.users u where u.id = v_uid;

  v_terms_version := nullif(v_meta ->> 'terms_version', '');
  if v_terms_version is null then
    raise exception 'terms_required' using errcode = '22023';
  end if;

  begin
    v_terms_accepted_at := (v_meta ->> 'terms_accepted_at')::timestamptz;
  exception when others then
    v_terms_accepted_at := null;
  end;

  insert into public.workshops (name, phone, nif, terms_version, terms_accepted_at)
  values (v_name, v_phone, v_nif, v_terms_version, coalesce(v_terms_accepted_at, now()))
  returning * into v_workshop;

  insert into public.workshop_members (workshop_id, user_id, role)
  values (v_workshop.id, v_uid, 'owner');

  return v_workshop;
end;
$$;

revoke execute on function public.create_workshop(text, text, text) from public, anon;
grant execute on function public.create_workshop(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: dados de exemplo (stub)
-- Depende da migração da fase 1 que acrescenta workshop_id a customers,
-- vehicles e service_orders (e as respetivas políticas). Até lá falha com
-- "not implemented"; a UI mostra um aviso e segue para /app.
-- ---------------------------------------------------------------------------

create or replace function public.load_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'not implemented' using errcode = '0A000';
end;
$$;

revoke execute on function public.load_demo_data() from public, anon;
grant execute on function public.load_demo_data() to authenticated;
