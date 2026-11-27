-- =============================================================================
-- Pagamento da subscrição dentro da app (Stripe Checkout + webhook).
--
-- 1. workshops.checkout_enabled: mostra (ou não) o ecrã "Subscrição" ao dono da oficina.
--    Desligado por omissão; só o admin (service role) o altera: os utilizadores não têm
--    grant nesta coluna. É uma opção de interface: o estado da conta continua a vir de
--    subscription_status (atualizado pelo webhook da Stripe ou à mão no admin).
-- 2. workshops.billing_interval: plano escolhido na Stripe ('month' | 'year'), informativo.
-- 3. workshops.cancel_at_period_end: o cliente pediu para cancelar no portal da Stripe;
--    a conta continua ativa até current_period_end e a app avisa.
--
-- subscription_status, current_period_end e stripe_* continuam a ser escritos só pela
-- service role (webhook /api/stripe/webhook e admin). O trigger de canceled_at já trata
-- a passagem a 'canceled' (retenção de 90 dias).
-- =============================================================================

alter table public.workshops
  add column if not exists checkout_enabled boolean not null default false,
  add column if not exists billing_interval text,
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.workshops
  drop constraint if exists workshops_billing_interval_check;
alter table public.workshops
  add constraint workshops_billing_interval_check
  check (billing_interval is null or billing_interval in ('month', 'year'));

comment on column public.workshops.checkout_enabled is
  'Mostra o ecrã de pagamento (Subscrição) ao dono. Só o admin altera.';
comment on column public.workshops.billing_interval is
  'Plano da subscrição Stripe: month | year. Escrito pelo webhook.';
comment on column public.workshops.cancel_at_period_end is
  'Cancelamento pedido no portal Stripe; ativa até current_period_end. Escrito pelo webhook.';
