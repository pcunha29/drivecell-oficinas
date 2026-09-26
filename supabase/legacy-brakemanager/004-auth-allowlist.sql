-- Login Google: allowlist de emails autorizados + Auth Hook before-user-created.
-- Aplicar no SQL Editor do Supabase. Depois configurar o hook no Dashboard
-- (Authentication → Auth Hooks → before-user-created → Postgres → hook_before_user_created).

begin;

-- 1. Tabela de emails autorizados (gerida manualmente via SQL Editor / Table Editor)
create table if not exists public.allowed_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
-- Sem políticas: utilizadores autenticados não leem nem editam a lista pela app.

-- Seed: emails dos utilizadores que já existem em auth.users
insert into public.allowed_emails (email)
select lower(u.email)
from auth.users u
where u.email is not null
on conflict (email) do nothing;

-- 2. Auth Hook — bloqueia criação de conta se o email não estiver na lista
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  user_email text;
begin
  user_email := lower(event->'user'->>'email');

  if user_email is null or user_email = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Email obrigatório para iniciar sessão.',
        'http_code', 403
      )
    );
  end if;

  if not exists (
    select 1 from public.allowed_emails where email = user_email
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Este email não está autorizado a aceder à aplicação.',
        'http_code', 403
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_before_user_created to supabase_auth_admin;
revoke execute on function public.hook_before_user_created from authenticated, anon, public;

-- 3. RPC — verificação em cada pedido (middleware da app)
create or replace function public.is_current_user_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_emails ae
    join auth.users u on lower(u.email) = ae.email
    where u.id = auth.uid()
  );
$$;

grant execute on function public.is_current_user_allowed() to authenticated;

commit;

-- Autorizar novo email:
--   insert into public.allowed_emails (email) values ('novo@exemplo.pt');
-- Revogar acesso:
--   delete from public.allowed_emails where email = 'antigo@exemplo.pt';
