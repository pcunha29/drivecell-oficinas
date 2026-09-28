-- =============================================================================
-- 1) Registo de ações do admin (admin_audit_log).
-- 2) Data de cancelamento (workshops.canceled_at) e eliminação automática
--    90 dias depois do fim do acesso (purge_canceled_workshops + pg_cron).
-- 3) Bucket público "avatars" (fotos de perfil; o upload é feito pelo servidor).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Registo de ações: só a service role lê e escreve.
-- -----------------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor text not null,               -- email do admin ou 'sistema'
  action text not null,              -- ex.: 'workshop.delete', 'workshop.purge'
  workshop_id uuid,                  -- sem FK: a oficina pode já não existir
  workshop_name text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) Cancelamento e retenção
-- -----------------------------------------------------------------------------

alter table public.workshops add column if not exists canceled_at timestamptz;

-- Oficinas que já estavam canceladas: conta a partir de agora.
update public.workshops
   set canceled_at = now()
 where subscription_status = 'canceled' and canceled_at is null;

create or replace function public.workshops_track_canceled_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subscription_status = 'canceled' then
    if tg_op = 'INSERT' then
      new.canceled_at := coalesce(new.canceled_at, now());
    elsif old.subscription_status is distinct from 'canceled' then
      new.canceled_at := now();
    else
      new.canceled_at := coalesce(new.canceled_at, old.canceled_at, now());
    end if;
  else
    new.canceled_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists workshops_canceled_at on public.workshops;
create trigger workshops_canceled_at
  before insert or update of subscription_status on public.workshops
  for each row execute function public.workshops_track_canceled_at();

/**
 * Data em que os dados de uma oficina cancelada são eliminados:
 * 90 dias depois do fim do acesso (o mais tarde entre o cancelamento e o fim do período pago).
 */
create or replace function public.workshop_purge_date(p_canceled_at timestamptz, p_period_end timestamptz)
returns timestamptz
language sql
immutable
as $$
  select greatest(p_canceled_at, coalesce(p_period_end, p_canceled_at)) + interval '90 days';
$$;

/**
 * Elimina as oficinas canceladas cuja data de eliminação já passou (nunca as de demonstração).
 * Apaga em cascata clientes, viaturas, ordens e membros; apaga também os utilizadores
 * que ficam sem nenhuma oficina.
 * Regista cada eliminação em admin_audit_log. Devolve quantas oficinas eliminou.
 */
create or replace function public.purge_canceled_workshops()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  v_count integer := 0;
  v_users uuid[];
  v_deleted_users integer;
begin
  for w in
    select id, name, canceled_at, current_period_end
      from public.workshops
     where subscription_status = 'canceled'
       and not is_demo
       and canceled_at is not null
       and public.workshop_purge_date(canceled_at, current_period_end) <= now()
     for update
  loop
    select coalesce(array_agg(user_id), '{}') into v_users
      from public.workshop_members where workshop_id = w.id;

    delete from public.workshops where id = w.id;

    -- Utilizadores que ficaram sem oficina.
    with orphan as (
      select u from unnest(v_users) as u
       where not exists (select 1 from public.workshop_members m where m.user_id = u)
    )
    delete from auth.users au using orphan where au.id = orphan.u;
    get diagnostics v_deleted_users = row_count;

    insert into public.admin_audit_log (actor, action, workshop_id, workshop_name, details)
    values ('sistema', 'workshop.purge', w.id, w.name,
            jsonb_build_object(
              'canceled_at', w.canceled_at,
              'current_period_end', w.current_period_end,
              'deleted_users', v_deleted_users,
              'reason', 'retenção de 90 dias após cancelamento'));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.purge_canceled_workshops() from public, anon, authenticated;
grant execute on function public.purge_canceled_workshops() to service_role;

-- Agenda diária (03:17 UTC) com pg_cron, se a extensão estiver disponível.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron indisponível (%): agenda a limpeza manualmente.', sqlerrm;
    return;
  end;
  if exists (select 1 from cron.job where jobname = 'drivecell-retencao-90-dias') then
    perform cron.unschedule('drivecell-retencao-90-dias');
  end if;
  perform cron.schedule('drivecell-retencao-90-dias', '17 3 * * *', 'select public.purge_canceled_workshops()');
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) Bucket "avatars": leitura pública pelo URL, upload só pelo servidor
--    (rota /api/upload-avatar com a service role). Máx. 2 MB, só imagens.
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', true, 2097152,
            array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;
