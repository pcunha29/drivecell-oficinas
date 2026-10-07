-- =============================================================================
-- Aceitação dos Termos e da Política de Privacidade no primeiro acesso.
--
-- Quem é convidado pelo admin nunca passou por um registo com checkbox: aceita na
-- página "Define a tua palavra-passe" (ou em /conta/aceitar-termos, para contas já
-- ativas e quando a versão dos termos muda).
--
-- terms_acceptances: uma linha por utilizador e versão, com a hora do servidor.
--   O utilizador só lê as suas; escreve-se apenas pela função accept_terms.
-- accept_terms(versão): regista a aceitação e, se o utilizador for dono de uma
--   oficina, guarda a versão em workshops.terms_version / terms_accepted_at.
-- =============================================================================

create table if not exists public.terms_acceptances (
  user_id uuid not null references auth.users (id) on delete cascade,
  version text not null check (char_length(version) between 1 and 20),
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);

alter table public.terms_acceptances enable row level security;

drop policy if exists "terms_acceptances_select_own" on public.terms_acceptances;
create policy "terms_acceptances_select_own"
  on public.terms_acceptances for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.terms_acceptances from anon, authenticated;
grant select on public.terms_acceptances to authenticated;

create or replace function public.accept_terms(p_version text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_version text := btrim(coalesce(p_version, ''));
  v_accepted_at timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if char_length(v_version) not between 1 and 20 then
    raise exception 'invalid_version' using errcode = '22023';
  end if;

  insert into public.terms_acceptances (user_id, version)
  values (v_uid, v_version)
  on conflict (user_id, version) do nothing;

  select accepted_at into v_accepted_at
    from public.terms_acceptances
   where user_id = v_uid and version = v_version;

  -- O contrato é com a oficina: guarda a versão aceite pelo dono.
  update public.workshops w
     set terms_version = v_version,
         terms_accepted_at = v_accepted_at
    from public.workshop_members m
   where m.workshop_id = w.id
     and m.user_id = v_uid
     and m.role = 'owner'
     and w.terms_version is distinct from v_version;

  return v_accepted_at;
end;
$$;

revoke execute on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;
