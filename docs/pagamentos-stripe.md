# Pagamento da subscrição na app (Stripe)

Branch: `feature/pagamentos-stripe`.

## Como funciona

1. **No admin** ligas «Pagamento na app» numa oficina (Admin → oficina → Funcionalidades).
2. **O dono vê o ecrã** «Subscrição» no menu do utilizador (`/app/subscricao`) e o botão «Ativar subscrição» nos avisos de fim do teste e de conta em só-leitura. Os mecânicos não veem nada disto.
3. **Escolhe o plano** (39 €/mês ou 349 €/ano) e vai para o checkout da Stripe. Paga com cartão ou débito direto SEPA (os meios ligados no painel Stripe) e pode indicar o NIF.
   - Se ainda estiver no teste, **só paga no fim do teste**: a Stripe recebe `trial_end` igual a `trial_ends_at`.
4. **Ao voltar**, a página sincroniza logo a subscrição e a conta fica ativa. O webhook `/api/stripe/webhook` mantém tudo atualizado daí em diante: renovações, falhas de pagamento, cancelamentos e mudanças de plano.
5. **Com a subscrição ativa**, o ecrã mostra «Gerir subscrição», que abre o portal da Stripe. Aí o cliente muda o cartão ou o IBAN, vê os recibos, muda de plano ou cancela.
6. **No admin**, o cartão «Pagamento (Stripe)» mostra o plano, a renovação e links para o cliente e a subscrição no painel Stripe. As mudanças de estado ficam no registo de atividade.

### Estados (Stripe → app)

| Stripe | App | A conta escreve? |
|---|---|---|
| `active`, `trialing` | Ativa | Sim |
| `past_due`, `unpaid`, `incomplete` (débito direto à espera do banco) | Pagamento em atraso | Sim, com aviso |
| `canceled`, `incomplete_expired`, `paused` | Cancelada | Não (só-leitura, retenção de 90 dias) |

O estado continua editável à mão no admin, por exemplo para quem paga por transferência. A próxima mudança na Stripe sobrepõe-se.

## 1. Preparar a Stripe (modo de teste primeiro)

1. **Preços:** em Produtos, confirma os dois preços recorrentes, **39 € mensal** e **349 € anual**, com IVA incluído. Copia os IDs `price_…`.
2. **Débito direto:** em Definições → Pagamentos → Métodos de pagamento, liga **Débito direto SEPA**. O cartão já vem ligado.
3. **Portal do cliente:** em Definições → Faturação → Portal do cliente, permite:
   - atualizar o método de pagamento;
   - ver o histórico de faturas;
   - cancelar subscrições (no fim do período);
   - mudar de plano entre os dois preços acima.

   Preenche também o nome da empresa, o link dos termos (`https://drivecell.pt/termos`) e a política de privacidade.
4. **Aspeto do checkout:** em Definições → Marca, põe o logótipo, o ícone e as cores (azul `#0d2c4a`, dourado `#b18d56`).
5. **Emails da Stripe** (opcional): em Definições → Emails de clientes, ativa os recibos e os avisos de pagamento falhado.

## 2. Variáveis de ambiente

Em `.env.local` (local) e na Vercel (produção):

```
STRIPE_SECRET_KEY=sk_test_...        # Developers → API keys (em produção: sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...      # do `stripe listen` (local) ou do endpoint (produção)
STRIPE_PRICE_MONTHLY=price_...       # 39 €/mês
STRIPE_PRICE_YEARLY=price_...        # 349 €/ano
```

Sem estas variáveis, o ecrã aparece na mesma, mas avisa que os pagamentos não estão disponíveis.

## 3. Migração

Aplica `supabase/migrations/20261118100000_pagamentos_stripe.sql` no SQL Editor do Supabase **antes de pôr o branch no ar**. Só acrescenta colunas, com valores por omissão, por isso é segura para a versão que está em produção.

- **Sem a migração**, a app desce para as colunas antigas e continua a funcionar.
- **O admin precisa das colunas novas.**

## 4. Testar localmente

O `.env.local` usa o mesmo projeto Supabase da produção. Testa só com uma **oficina de teste criada para isso**, nunca com oficinas de clientes: o admin «Nova oficina» com o teu email, por exemplo `pcunhadev+stripe@…`.

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

O `stripe listen` mostra um `whsec_…`: põe-no em `STRIPE_WEBHOOK_SECRET` e reinicia o `npm run dev`.

**Dados de teste:**

| | |
|---|---|
| Cartão que paga | `4242 4242 4242 4242`, qualquer data futura, qualquer CVC |
| Cartão com 3D Secure | `4000 0025 0000 3155` |
| Cartão recusado | `4000 0000 0000 0002` |
| IBAN que paga (SEPA) | `AT61 1904 3002 3457 3201` (confirma passados uns minutos) |
| IBAN que falha (SEPA) | `AT86 1904 3002 3547 3202` |

**Cenários a confirmar:**

- [ ] Oficina em teste (dias a sobrar) → pagar → «Subscrição ativa». Na Stripe aparece em período experimental até ao fim do teste, e o aviso de fim do teste desaparece.
- [ ] Teste expirado (muda «Fim do teste» no admin para ontem) → aviso de só-leitura com «Ativar subscrição» → pagar → a conta volta a escrever.
- [ ] Plano anual → o admin mostra «Anual» e a data de renovação.
- [ ] Débito direto com o IBAN que paga → fica «Pagamento por confirmar» e passa a ativa sozinha.
- [ ] IBAN que falha → «Pagamento em atraso» (a app continua a escrever) → atualizar o IBAN no portal.
- [ ] «Gerir subscrição» → cancelar no portal → aviso «fica ativa até…». No painel Stripe, «Cancelar já» → só-leitura.
- [ ] Mecânico (membro) não vê «Subscrição» no menu, e `/app/subscricao` leva-o ao quadro.
- [ ] Desligar «Pagamento na app» → sem cliente na Stripe, o ecrã desaparece. Quem já tem cliente continua a ver «Gerir subscrição».
- [ ] Renovações: usa os **relógios de teste** da Stripe (Billing → Test clocks) para avançar um mês.

## 5. Pôr em produção

1. **Migração:** aplica-a no Supabase (ponto 3).
2. **Stripe em modo live:** repete o ponto 1 (preços, SEPA, portal, marca).
3. **Webhook:** em Developers → Webhooks → Adicionar endpoint, `https://drivecell.pt/api/stripe/webhook`, com os eventos:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`,
   `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`.
4. **Vercel:** as 4 variáveis com os valores live, incluindo o `whsec_` do endpoint. Faz merge do branch.
5. **No admin**, liga «Pagamento na app» nas oficinas que vão pagar.

## Faturas

Os recibos da Stripe **não são faturas certificadas pela AT**. Cada pagamento precisa de fatura emitida num programa certificado (InvoiceXpress, Moloni, Vendus…). Alguns ligam-se à Stripe e emitem a fatura automaticamente, com o NIF que o cliente indica no checkout.
