import { describe, expect, it } from "vitest";
import {
  admin,
  count,
  createUser,
  createWorkshop,
  customerWithVehicle,
  ownerWithWorkshop,
  pgError,
  service,
  sql,
  user,
} from "./helpers";

async function summary(workshopId: string) {
  const [row] = await sql<{
    customers: number;
    vehicles: number;
    orders: number;
    items: number;
    items_without_cost: number;
    below_cost: number;
    slugs: string[];
    customer_seq: number;
    track_costs: boolean;
  }>(
    admin,
    `select
       (select count(*)::int from public.customers where workshop_id = w.id) as customers,
       (select count(*)::int from public.vehicles where workshop_id = w.id) as vehicles,
       (select count(*)::int from public.service_orders where workshop_id = w.id) as orders,
       (select count(*)::int from public.service_order_items where workshop_id = w.id) as items,
       (select count(*)::int from public.service_order_items where workshop_id = w.id and unit_cost is null) as items_without_cost,
       (select count(*)::int from public.service_order_items where workshop_id = w.id and unit_price < unit_cost) as below_cost,
       (select array_agg(slug order by slug) from public.customers where workshop_id = w.id) as slugs,
       w.customer_seq,
       w.track_costs
     from public.workshops w where w.id = $1`,
    [workshopId],
  );
  return row;
}

const SLUGS = ["c-1", "c-2", "c-3", "c-4", "c-5", "c-6", "c-7", "c-8"];

describe("oficina de demonstração", () => {
  it("é criada já com dados realistas e custos em todas as linhas", async () => {
    const ownerId = await createUser();
    const workshopId = await createWorkshop(ownerId, { isDemo: true, status: "active" });

    const s = await summary(workshopId);
    expect(s).toMatchObject({ customers: 8, vehicles: 11, orders: 22, items_without_cost: 0, below_cost: 1, customer_seq: 8, track_costs: true });
    expect(s.items).toBeGreaterThan(40);
    expect(s.slugs).toEqual(SLUGS);

    // Há ordens em todos os estados do quadro, e entregues por cobrar.
    const statuses = await sql<{ status: string }>(
      admin,
      "select distinct status from public.service_orders where workshop_id = $1 order by status",
      [workshopId],
    );
    expect(statuses.map((r) => r.status)).toEqual(["delivered", "done", "in_progress", "waiting"]);
    expect(await count("public.service_orders", "workshop_id = $1 and status = 'delivered' and not paid", [workshopId])).toBeGreaterThan(0);
  });

  it("repor a demo apaga o que foi mexido e volta ao estado inicial", async () => {
    const ownerId = await createUser();
    const workshopId = await createWorkshop(ownerId, { isDemo: true, status: "active" });
    const before = await summary(workshopId);

    // Alguém experimenta a demo: cria e apaga coisas.
    const owner = user(ownerId);
    await customerWithVehicle(owner, "DE-MO-01");
    await sql(owner, "delete from public.service_orders where id = (select id from public.service_orders limit 1)");
    expect((await summary(workshopId)).customers).toBe(9);

    await sql(service, "select public.seed_demo_data($1)", [workshopId]);
    expect(await summary(workshopId)).toEqual(before);
  });

  it("repor a demo de uma oficina não toca nas outras", async () => {
    const other = await ownerWithWorkshop();
    const otherData = await customerWithVehicle(other.owner, "NA-OM-EX");

    const demoOwner = await createUser();
    const demoId = await createWorkshop(demoOwner, { isDemo: true, status: "active" });
    await sql(service, "select public.seed_demo_data($1)", [demoId]);

    expect(await count("public.customers", "workshop_id = $1", [other.workshopId])).toBe(1);
    expect(await count("public.vehicles", "id = $1", [otherData.vehicleId])).toBe(1);
  });

  it("numa oficina normal, carregar exemplos não liga o registo de custos", async () => {
    const ws = await ownerWithWorkshop();
    await sql(service, "select public.seed_demo_data($1)", [ws.workshopId]);
    expect((await summary(ws.workshopId)).track_costs).toBe(false);
  });

  it("só o servidor (service role) pode repor dados", async () => {
    const ws = await ownerWithWorkshop();
    expect((await pgError(sql(ws.owner, "select public.seed_demo_data($1)", [ws.workshopId]))).code).toBe("42501");
  });

  it("o dono pode carregar exemplos numa oficina vazia, uma vez", async () => {
    const ws = await ownerWithWorkshop();
    await sql(ws.owner, "select public.load_demo_data()");
    expect((await summary(ws.workshopId)).customers).toBe(8);

    const again = await pgError(sql(ws.owner, "select public.load_demo_data()"));
    expect(again.message).toContain("workshop_not_empty");
  });

  it("uma oficina só de leitura não pode carregar exemplos", async () => {
    const ws = await ownerWithWorkshop({ status: "trialing", trialDays: -1 });
    const err = await pgError(sql(ws.owner, "select public.load_demo_data()"));
    expect(err.message).toContain("not_allowed");
  });
});
