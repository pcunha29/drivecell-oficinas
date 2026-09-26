-- =============================================================================
-- Modo "em construção" do site público e lista de interessados.
--
-- site_settings: uma única linha (id = 1). Leitura pública (o middleware lê-a com
--   a chave anon para decidir se mostra a página "Em construção"); só a service
--   role altera (toggle no /admin/site).
-- interessados: emails deixados na página "Em construção". Sem políticas RLS:
--   só a service role lê e escreve (server action e admin).
-- =============================================================================

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  under_construction boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Começa LIGADO: o primeiro deploy em produção fica escondido até o desligares.
insert into public.site_settings (id, under_construction)
values (1, true)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "site_settings: leitura pública" on public.site_settings;
create policy "site_settings: leitura pública"
  on public.site_settings for select
  to anon, authenticated
  using (true);

revoke insert, update, delete, truncate on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;

create table if not exists public.interessados (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'em-construcao',
  created_at timestamptz not null default now(),
  contacted_at timestamptz,
  constraint interessados_email_formato check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 254
    and position('@' in email) > 1
  ),
  constraint interessados_source_tamanho check (char_length(source) <= 40)
);

create unique index if not exists interessados_email_key on public.interessados (email);
create index if not exists interessados_created_at_idx on public.interessados (created_at desc);

alter table public.interessados enable row level security;
-- Sem políticas de propósito: anon/authenticated não veem nem inserem nada.
revoke all on public.interessados from anon, authenticated;
