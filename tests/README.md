# Testes

Dois conjuntos, ambos com [Vitest](https://vitest.dev):

| Comando | O que testa | Precisa de |
| --- | --- | --- |
| `npm test` | Lógica pura: faturação e margem, CSV (exportar e importar), formulários, modo em construção, `workshopCanWrite`. | Nada. |
| `npm run test:db` | As migrações de `supabase/migrations` num Postgres descartável: isolamento entre oficinas (RLS), `save_order`, apagar em cascata, oficina só de leitura quando o período acaba, repor a demo, retenção de 90 dias. | Um Postgres local e `TEST_DATABASE_URL`. |

Os dois correm no GitHub em cada push (`.github/workflows/ci.yml`), com tipos, lint e build.

## Base de dados

`tests/db/global-setup.ts` cria uma base de dados nova (`drivecell_test_…`), aplica
`tests/db/supabase-stub.sql` (papéis `anon`/`authenticated`/`service_role`, `auth.users`
e `auth.uid()` como no Supabase) e todas as migrações por ordem. No fim apaga-a.
Uma migração que não corre de raiz faz falhar os testes.

Os pedidos são feitos como na app: `user(id)` usa o papel `authenticated` com o JWT do
utilizador (o RLS aplica-se), `anon` é um visitante, `service` é a service role do admin.

Para correr no Mac, com Docker:

```bash
docker run --rm -d --name drivecell-test-db -e POSTGRES_PASSWORD=postgres -p 54329:5432 postgres:16
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres npm run test:db
docker stop drivecell-test-db
```

Ou com o Postgres do Homebrew (`brew install postgresql@16`), usando o teu utilizador:
`TEST_DATABASE_URL=postgres://localhost:5432/postgres npm run test:db`.

Por segurança, os testes recusam ligações que não sejam locais. Nunca uses aqui o
endereço do Supabase de produção (nem o da BlackGarage).
