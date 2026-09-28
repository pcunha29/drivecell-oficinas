# Backup da base de dados (Supabase)

Backup automático **quinzenal** da base de dados via GitHub Actions
(`.github/workflows/db-backup.yml`).

- **Quando**: dias 1 e 15 de cada mês, 03:00 UTC. Também pode ser disparado à mão
  em _Actions → DB Backup (quinzenal) → Run workflow_.
- **O que inclui**: roles, schema do `public` e dados dos schemas `public` e `auth`
  (ou seja, dados da app **+** utilizadores).
- **Onde fica**: como _artifact_ do run, encriptado com GPG (AES256).
- **Retenção**: 90 dias (expira automaticamente). Mantém-se sempre ~6 backups
  recentes em rotação. Recomenda-se descarregar um backup manualmente de vez em
  quando para guardar fora do GitHub (arquivo de longo prazo).

## Pré-requisitos (uma só vez)

Não é preciso `supabase link` nem integração GitHub↔Supabase. O workflow liga-se
à BD apenas pela connection string. Em _GitHub → Settings → Secrets and variables
→ Actions_, cria:

- `SUPABASE_DB_URL` - connection string do Dashboard
  (_Project Settings → Database → Connection string_, modo **Session** ou
  **Direct**, porta **5432**; a porta 6543/transaction **não** serve para `pg_dump`).
- `BACKUP_GPG_PASSPHRASE` - frase forte usada para encriptar/desencriptar o backup.
  Guarda-a num gestor de palavras-passe - **sem ela não há restauro possível**.

## Restauro

```bash
# 1. Desencriptar
gpg --decrypt --passphrase "A_TUA_PASSPHRASE" backup-XXXX.tar.gz.gpg > b.tar.gz

# 2. Extrair
tar -xzf b.tar.gz

# 3. Aplicar (pela ordem: roles -> schema -> dados)
psql "$SUPABASE_DB_URL" -f backup-XXXX/roles.sql
psql "$SUPABASE_DB_URL" -f backup-XXXX/schema.sql
psql "$SUPABASE_DB_URL" -f backup-XXXX/data.sql
```

> Para restaurar para um projeto novo/vazio, usa a `SUPABASE_DB_URL` desse projeto.

## Notas

- Os artifacts contêm **dados pessoais de clientes** (RGPD): por isso vão sempre
  encriptados. Não desencriptes para pastas partilhadas/repos.
- Ficheiros do Storage (avatares) **não** são incluídos neste backup - só a BD
  Postgres. Se for preciso, pode ser adicionado depois.
- Para histórico mais longo que 90 dias, trocar o destino do artifact por
  armazenamento externo (Cloudflare R2 / Backblaze B2) sem alterar o resto.
