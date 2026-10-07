import { beforeAll, describe, expect, it } from "vitest";
import { workshopCanWrite } from "@/lib/workshop";
import {
  admin,
  createUser,
  createWorkshop,
  customerWithVehicle,
  exec,
  pgError,
  saveOrder,
  sql,
  user,
  type WorkshopOptions,
} from "./helpers";

type Case = { label: string; options: WorkshopOptions; writable: boolean };

const CASES: Case[] = [
  { label: "teste a decorrer", options: { status: "trialing", trialDays: 7 }, writable: true },
  { label: "teste terminado", options: { status: "trialing", trialDays: -1 }, writable: false },
  { label: "subscrição ativa", options: { status: "active", trialDays: -30 }, writable: true },
  { label: "pagamento em atraso (tolerância)", options: { status: "past_due", trialDays: -30 }, writable: true },
  { label: "cancelada", options: { status: "canceled", trialDays: -30 }, writable: false },
];

/**
 * Quando o período acaba (teste terminado ou subscrição cancelada) a oficina
 * continua a ver tudo, mas deixa de poder criar, alterar ou apagar.
 */
describe.each(CASES)("oficina com $label", ({ options, writable }) => {
  let ownerId: string;
  let workshopId: string;
  let data: Awaited<ReturnType<typeof customerWithVehicle>>;
  let orderId: string;

  beforeAll(async () => {
    ownerId = await createUser();
    // Os dados são criados enquanto a oficina pode escrever; depois muda-se o estado.
    workshopId = await createWorkshop(ownerId, { status: "trialing", trialDays: 7 });
    data = await customerWithVehicle(user(ownerId), "RO-00-01");
    orderId = await saveOrder(user(ownerId), {
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      description: "Ordem antiga",
      items: [{ description: "Peça", quantity: 1, unitPrice: 50 }],
    });
    await sql(
      admin,
      "update public.workshops set subscription_status = $2, trial_ends_at = now() + make_interval(secs => $3) where id = $1",
      [workshopId, options.status, (options.trialDays ?? 0) * 86_400],
    );
  });

  it("a app e a base de dados concordam sobre se pode escrever", async () => {
    const owner = user(ownerId);
    const [row] = await sql<{ can_write: boolean; subscription_status: "trialing"; trial_ends_at: string }>(
      owner,
      "select public.can_write(id) as can_write, subscription_status, trial_ends_at from public.workshops where id = $1",
      [workshopId],
    );
    expect(row.can_write).toBe(writable);
    expect(workshopCanWrite({ subscription_status: row.subscription_status, trial_ends_at: row.trial_ends_at })).toBe(writable);
  });

  it("continua a ver os dados", async () => {
    const owner = user(ownerId);
    expect(await sql(owner, "select id from public.customers")).toHaveLength(1);
    expect(await sql(owner, "select id from public.service_orders")).toHaveLength(1);
    expect(await sql(owner, "select id from public.service_order_items")).toHaveLength(1);
  });

  it(writable ? "pode criar, alterar e apagar" : "não pode criar, alterar nem apagar", async () => {
    const owner = user(ownerId);

    const insert = sql(owner, "insert into public.customers (name) values ('Novo cliente')");
    if (writable) await insert;
    else expect((await pgError(insert)).code).toBe("42501");

    const updated = await exec(owner, "update public.customers set notes = 'editado' where id = $1", [data.customerId]);
    expect(updated).toBe(writable ? 1 : 0);

    const newOrder = saveOrder(owner, { customerId: data.customerId, vehicleId: data.vehicleId, description: "Nova" });
    if (writable) await newOrder;
    else expect((await pgError(newOrder)).code).toBe("42501");

    const editOrder = saveOrder(owner, { orderId, customerId: null, vehicleId: null, status: "delivered", items: [] });
    if (writable) await editOrder;
    else expect((await pgError(editOrder)).message).toContain("order_not_found");

    const deleted = await exec(owner, "delete from public.vehicles where id = $1", [data.vehicleId]);
    expect(deleted).toBe(writable ? 1 : 0);
  });
});

describe("fim do período", () => {
  it("o teste acaba à hora marcada, não ao fim do dia", async () => {
    const ownerId = await createUser();
    const workshopId = await createWorkshop(ownerId, { trialDays: 1 });
    const owner = user(ownerId);
    await sql(owner, "insert into public.customers (name) values ('Antes')");

    await sql(admin, "update public.workshops set trial_ends_at = now() - interval '1 second' where id = $1", [workshopId]);
    expect((await pgError(sql(owner, "insert into public.customers (name) values ('Depois')"))).code).toBe("42501");
  });

  it("reativar a oficina devolve a escrita sem perder dados", async () => {
    const ownerId = await createUser();
    const workshopId = await createWorkshop(ownerId, { status: "canceled" });
    const owner = user(ownerId);
    expect((await pgError(sql(owner, "insert into public.customers (name) values ('X')"))).code).toBe("42501");

    await sql(admin, "update public.workshops set subscription_status = 'active' where id = $1", [workshopId]);
    await sql(owner, "insert into public.customers (name) values ('De volta')");
    expect(await sql(owner, "select id from public.customers")).toHaveLength(1);
  });
});
