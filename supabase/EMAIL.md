# Emails de autenticação (convite e nova palavra-passe)

Os emails de convite e de recuperação são enviados pelo Supabase Auth. Para saírem de
`noreply@drivecell.pt`, com o design da DriveCell e com links que não falham, são precisas
três coisas no painel: **SMTP próprio**, **templates** e **URLs**. Os templates vivem neste
repositório, em [`email-templates/`](email-templates/) — editar aqui e voltar a colar no painel.

> Sem SMTP próprio, o Supabase envia de `noreply@mail.app.supabase.io`, com limites muito
> baixos (poucos emails por hora) e pensado para testes: **não usar com clientes**.

## 1. Domínio de envio (Resend)

Recomendado: [Resend](https://resend.com) (plano gratuito: 3000 emails/mês, 100/dia; região UE).

1. Criar conta → **Domains → Add domain** → `drivecell.pt`, região **EU (Ireland)**.
2. Copiar os registos DNS que o Resend mostra para o gestor do domínio (registos TXT de
   SPF e DKIM e um MX no subdomínio `send.drivecell.pt`). Não mexem no email que já recebem em
   `geral@drivecell.pt`.
3. Se ainda não existir, acrescentar DMARC: `TXT _dmarc.drivecell.pt` →
   `v=DMARC1; p=none; rua=mailto:geral@drivecell.pt`
4. Esperar pelo estado **Verified**.
5. **API Keys → Create** → permissão *Sending access*, domínio `drivecell.pt`. Guardar a chave
   (só é mostrada uma vez).

## 2. Supabase → Authentication → Emails → SMTP Settings

| Campo | Valor |
|---|---|
| Enable custom SMTP | ligado |
| Sender email | `noreply@drivecell.pt` |
| Sender name | `DriveCell Oficinas` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a API key do passo 1.5 |

Depois, em **Authentication → Rate Limits**, subir *Rate limit for sending emails* (ex.: 30 por
hora) — o valor por omissão com SMTP próprio é baixo.

## 3. Supabase → Authentication → Emails → Templates

| Template | Assunto | Corpo (colar o ficheiro inteiro) |
|---|---|---|
| **Invite user** | `O teu acesso ao DriveCell Oficinas` | [`email-templates/convite.html`](email-templates/convite.html) |
| **Reset password** | `Nova palavra-passe · DriveCell Oficinas` | [`email-templates/recuperar-palavra-passe.html`](email-templates/recuperar-palavra-passe.html) |

Os templates usam `{{ .TokenHash }}` e levam a `/auth/confirm?token_hash=…`: funcionam em
qualquer browser ou telemóvel (não dependem de cookies) e os antivírus dos emails não gastam o
link (o token só é usado quando a pessoa carrega em "Continuar"). O convite usa também
`{{ .Data.full_name }}` e `{{ .Data.workshop_name }}`, que o admin guarda ao criar a oficina.

## 4. Supabase → Authentication → URL Configuration

- **Site URL**: `https://drivecell.pt` (exatamente o domínio onde a app está: os templates usam
  `{{ .SiteURL }}`).
- **Redirect URLs**: `https://drivecell.pt/**` e `http://localhost:3000/**`.

## 5. Validade dos links

**Authentication → Providers → Email → Email OTP Expiration**: `86400` (24 horas, o máximo). Os
templates dizem "válido durante 24 horas". O valor por omissão é 1 hora — curto para quem abre o
email ao fim do dia.

## 6. Testar

1. Em `/admin/nova`, criar uma oficina de teste com um email teu (ou «Reenviar email» numa
   oficina cujo dono ainda não entrou).
2. Confirmar: remetente `DriveCell Oficinas <noreply@drivecell.pt>`, design, nome da oficina.
3. Abrir o link **noutro browser ou no telemóvel** (no browser do admin a sessão do admin seria
   trocada pela do convidado) → «Continuar» → definir palavra-passe → aceitar os termos → `/app`.
4. Apagar a oficina de teste no admin.

## Rede de segurança na app

Mesmo com um template antigo (`{{ .ConfirmationURL }}`), o convite funciona: a Supabase devolve a
sessão no fragmento do URL (`#access_token=…`) e a app lê-o em `/auth/continuar`; se chegar a outra
página (p.ex. a inicial, quando o endereço não está nos Redirect URLs), é encaminhado para lá
(`src/components/auth-hash-redirect.tsx`). Links expirados mostram "Este link já foi usado ou
expirou…" em vez de um erro genérico.
