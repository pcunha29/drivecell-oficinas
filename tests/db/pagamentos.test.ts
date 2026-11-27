import { describe, expect, it } from "vitest";
import { addMember, createUser, exec, ownerWithWorkshop, pgError, service, sql, user } from "./helpers";

/**
 * Pagamento na app (migração 20261118100000): as colunas novas existem com os valores
 * por omissão e só a service role (admin e webhook da Stripe) as altera.
 */
describe("pagamentos: colunas da subscrição", () => {
  it("começam desligadas e o dono ou um mecânico não as conseguem mudar", async () => {
    const ws = await ownerWithWorkshop();
    const mechanic = await createUser();
    await addMember(ws.workshopId, mechanic, "member");

    const [row] = await sql<{ checkout_enabled: boolean; billing_interval: string | null; cancel_at_period_end: boolean }>(
      ws.owner,
      "select checkout_enabled, billing_interval, cancel_at_period_end from public.workshops",
    );
    expect(row).toEqual({ checkout_enabled: false, billing_interval: null, cancel_at_period_end: false });

    for (const actor of [ws.owner, user(mechanic)]) {
      for (const statement of [
        "update public.workshops set checkout_enabled = true where id = $1",
        "update public.workshops set subscription_status = 'active' where id = $1",
        "update public.workshops set stripe_customer_id = 'cus_x' where id = $1",
        "update public.workshops set billing_interval = 'year' where id = $1",
      ]) {
        const err = await pgError(exec(actor, statement, [ws.workshopId]));
        expect(err.code).toBe("42501");
      }
    }
  });

  it("a service role grava o que vem da Stripe e o intervalo só aceita month/year", async () => {
    const ws = await ownerWithWorkshop();
    expect(
      await exec(
        service,
        `update public.workshops
            set checkout_enabled = true, subscription_status = 'active', billing_interval = 'year',
                cancel_at_period_end = true, stripe_customer_id = 'cus_t1', stripe_subscription_id = 'sub_t1'
          where id = $1`,
        [ws.workshopId],
      ),
    ).toBe(1);

    const err = await pgError(
      exec(service, "update public.workshops set billing_interval = 'week' where id = $1", [ws.workshopId]),
    );
    expect(err.code).toBe("23514");
  });

  it("cancelada pela Stripe fica só-leitura e com data de cancelamento", async () => {
    const ws = await ownerWithWorkshop();
    await exec(service, "update public.workshops set subscription_status = 'canceled' where id = $1", [ws.workshopId]);
    const [row] = await sql<{ can_write: boolean; canceled_at: string | null }>(
      ws.owner,
      "select public.can_write(id) as can_write, canceled_at from public.workshops",
    );
    expect(row.can_write).toBe(false);
    expect(row.canceled_at).not.toBeNull();
  });
});
