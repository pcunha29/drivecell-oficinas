import { describe, expect, it } from "vitest";
import {
  checkoutTrialEnd,
  hasLiveSubscription,
  mapStripeStatus,
  subscriptionInterval,
  subscriptionPeriodEnd,
  workshopUpdateFromSubscription,
  type StripeSubscriptionLike,
} from "@/lib/subscription";
import { workshopCanWrite } from "@/lib/workshop";

const NOW = new Date("2026-11-18T12:00:00.000Z");
const unix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

const sub = (over: Partial<StripeSubscriptionLike> = {}): StripeSubscriptionLike => ({
  id: "sub_123",
  status: "active",
  customer: "cus_123",
  cancel_at_period_end: false,
  trial_end: null,
  metadata: { workshop_id: "ws_1" },
  items: {
    data: [{ current_period_end: unix("2026-12-18T12:00:00Z"), price: { recurring: { interval: "month" } } }],
  },
  ...over,
});

describe("mapStripeStatus", () => {
  it.each([
    ["active", "active"],
    ["trialing", "active"],
    ["past_due", "past_due"],
    ["unpaid", "past_due"],
    ["incomplete", "past_due"],
    ["canceled", "canceled"],
    ["incomplete_expired", "canceled"],
    ["paused", "canceled"],
    ["qualquer_coisa_nova", "canceled"],
  ] as const)("%s → %s", (stripe, app) => {
    expect(mapStripeStatus(stripe)).toBe(app);
  });

  it("só os estados pagos ou por confirmar deixam escrever", () => {
    const canWrite = (s: string) =>
      workshopCanWrite({ subscription_status: mapStripeStatus(s), trial_ends_at: "2020-01-01T00:00:00Z" }, NOW);
    expect(canWrite("active")).toBe(true);
    expect(canWrite("incomplete")).toBe(true); // débito direto à espera do banco
    expect(canWrite("canceled")).toBe(false);
  });
});

describe("subscriptionPeriodEnd / subscriptionInterval", () => {
  it("usa o fim do período dos itens (API nova)", () => {
    expect(subscriptionPeriodEnd(sub())).toBe("2026-12-18T12:00:00.000Z");
    expect(subscriptionInterval(sub())).toBe("month");
  });

  it("aceita o campo antigo na subscrição e cai para o fim do teste", () => {
    const old = sub({ items: { data: [{}] }, current_period_end: unix("2027-01-01T00:00:00Z") });
    expect(subscriptionPeriodEnd(old)).toBe("2027-01-01T00:00:00.000Z");
    const trial = sub({ items: { data: [{}] }, trial_end: unix("2026-12-01T00:00:00Z") });
    expect(subscriptionPeriodEnd(trial)).toBe("2026-12-01T00:00:00.000Z");
    expect(subscriptionPeriodEnd(sub({ items: { data: [] } }))).toBeNull();
  });

  it("intervalo desconhecido fica null", () => {
    expect(subscriptionInterval(sub({ items: { data: [{ price: { recurring: { interval: "week" } } }] } }))).toBeNull();
  });
});

describe("workshopUpdateFromSubscription", () => {
  it("grava estado, ids, período, plano e cancelamento", () => {
    expect(
      workshopUpdateFromSubscription(
        sub({ customer: { id: "cus_obj" }, cancel_at_period_end: true, status: "past_due" }),
      ),
    ).toEqual({
      subscription_status: "past_due",
      stripe_subscription_id: "sub_123",
      stripe_customer_id: "cus_obj",
      current_period_end: "2026-12-18T12:00:00.000Z",
      billing_interval: "month",
      cancel_at_period_end: true,
    });
  });
});

describe("checkoutTrialEnd (não perder os dias de teste)", () => {
  it("adia a primeira cobrança para o fim do teste", () => {
    const ws = { subscription_status: "trialing" as const, trial_ends_at: "2026-12-01T23:59:59Z" };
    expect(checkoutTrialEnd(ws, NOW)).toBe(unix("2026-12-01T23:59:59Z"));
  });

  it("cobra logo se faltam menos de ~2 dias, o teste acabou ou já não está em teste", () => {
    expect(checkoutTrialEnd({ subscription_status: "trialing", trial_ends_at: "2026-11-19T12:00:00Z" }, NOW)).toBeNull();
    expect(checkoutTrialEnd({ subscription_status: "trialing", trial_ends_at: "2026-11-01T00:00:00Z" }, NOW)).toBeNull();
    expect(checkoutTrialEnd({ subscription_status: "canceled", trial_ends_at: "2026-12-30T00:00:00Z" }, NOW)).toBeNull();
  });
});

describe("hasLiveSubscription", () => {
  it("só com subscrição na Stripe e estado ativo ou em atraso", () => {
    expect(hasLiveSubscription({ subscription_status: "active", stripe_subscription_id: "sub_1" })).toBe(true);
    expect(hasLiveSubscription({ subscription_status: "past_due", stripe_subscription_id: "sub_1" })).toBe(true);
    expect(hasLiveSubscription({ subscription_status: "canceled", stripe_subscription_id: "sub_1" })).toBe(false);
    // Ativada à mão no admin (sem Stripe): pode pagar na app.
    expect(hasLiveSubscription({ subscription_status: "active", stripe_subscription_id: null })).toBe(false);
  });
});
