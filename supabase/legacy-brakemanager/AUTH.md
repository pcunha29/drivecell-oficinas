# Autenticação Google (allowlist de emails)

Login **apenas com Google**. Só entram emails presentes em `public.allowed_emails`.

## 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Criar **OAuth 2.0 Client ID** (tipo _Web application_).
3. **Authorized redirect URI**:
   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```
   (`PROJECT_REF` em Supabase → Project Settings → General)
4. Guardar **Client ID** e **Client Secret**.

## 2. Supabase Dashboard

### Authentication → Providers

| Definição  | Valor                                                               |
| ---------- | ------------------------------------------------------------------- |
| **Google** | Enabled - colar Client ID + Secret                                  |
| **Email**  | Disable sign ups (e desligar provider se quiseres forçar só Google) |

### Authentication → URL Configuration

- **Site URL**: `http://localhost:3000` (dev) ou URL de produção.
- **Redirect URLs** (adicionar todas as que uses):
  - `http://localhost:3000/auth/callback`
  - `https://<teu-dominio>/auth/callback`

### Authentication → Settings

- Ativar **Automatic linking** - contas email/password existentes associam-se ao Google pelo mesmo email.

### Authentication → Auth Hooks

| Campo  | Valor                             |
| ------ | --------------------------------- |
| Hook   | `before-user-created`             |
| Tipo   | Postgres function                 |
| Função | `public.hook_before_user_created` |

> Correr primeiro [`migrations/004-auth-allowlist.sql`](migrations/004-auth-allowlist.sql) no SQL Editor.

## 3. Migração SQL

```bash
# SQL Editor ou:
psql "$SUPABASE_DB_URL" -f supabase/migrations/004-auth-allowlist.sql
```

A migração:

- Cria `allowed_emails` e faz seed dos emails já em `auth.users`.
- Cria o hook e a função `is_current_user_allowed()` usada pelo middleware.

## 4. Gerir emails autorizados

**Autorizar** (SQL Editor):

```sql
insert into public.allowed_emails (email) values ('novo@exemplo.pt');
```

**Revogar**:

```sql
delete from public.allowed_emails where email = 'antigo@exemplo.pt';
-- opcional: apagar o utilizador em Authentication → Users
```

Emails guardados sempre em **minúsculas**.

## 5. Primeiro login dos utilizadores atuais

1. Confirmar que o email está em `allowed_emails`.
2. Entrar em `/login` → **Continuar com Google** com o **mesmo email** que já tinham.
3. Com automatic linking, a identidade Google associa-se à conta existente.

## 6. Variáveis de ambiente

Ver [`.env.example`](../.env.example). Não são necessárias chaves Google na app - só no Supabase Dashboard.
