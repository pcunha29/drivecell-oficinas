import { beforeAll, describe, expect, it } from "vitest";
import {
  addMember,
  admin,
  anon,
  count,
  createUser,
  customerWithVehicle,
  exec,
  ownerWithWorkshop,
  pgError,
  sql,
  user,
} from "./helpers";

/** Uma oficina nunca vê nem mexe nos dados de outra. */
describe("isolamento entre oficinas (RLS)", () => {
  let a: Awaited<ReturnType<typeof ownerWithWorkshop>>;
  let b: Awaited<ReturnType<typeof ownerWithWorkshop>>;
  let aData: Awaited<ReturnType<typeof customerWithVehicle>>;
  let bData: Awaited<ReturnType<typeof customerWithVehicle>>;

  beforeAll(async () => {
    a = await ownerWithWorkshop({ name: "Oficina A" });
    b = await ownerWithWorkshop({ name: "Oficina B" });
    aData = await customerWithVehicle(a.owner, "AA-11-AA");
    bData = await customerWithVehicle(b.owner, "BB-22-BB");
  });

  it("preenche workshop_id com a oficina de quem cria", async () => {
    const [row] = await sql<{ workshop_id: string }>(admin, "select workshop_id from public.customers where id = $1", [
      aData.customerId,
    ]);
    expect(row.workshop_id).toBe(a.workshopId);
    expect(aData.slug).toBe("c-1");
  });

  it("cada dono só vê os seus clientes, viaturas e oficina", async () => {
    const customers = await sql<{ id: string }>(a.owner, "select id from public.customers");
    expect(customers.map((c) => c.id)).toEqual([aData.customerId]);

    const vehicles = await sql<{ id: string }>(a.owner, "select id from public.vehicles");
    expect(vehicles.map((v) => v.id)).toEqual([aData.vehicleId]);

    const workshops = await sql<{ id: string }>(a.owner, "select id from public.workshops");
    expect(workshops.map((w) => w.id)).toEqual([a.workshopId]);
  });

  it("não deixa criar dados noutra oficina", async () => {
    const err = await pgError(
      sql(a.owner, "insert into public.customers (workshop_id, name) values ($1, 'Intruso')", [b.workshopId]),
    );
    expect(err.code).toBe("42501");
  });

  it("não deixa alterar nem apagar dados de outra oficina", async () => {
    expect(await exec(a.owner, "update public.customers set name = 'Alterado' where id = $1", [bData.customerId])).toBe(0);
    expect(await exec(a.owner, "delete from public.vehicles where id = $1", [bData.vehicleId])).toBe(0);
    expect(await count("public.customers", "id = $1 and name = 'Cliente Teste'", [bData.customerId])).toBe(1);
    expect(await count("public.vehicles", "id = $1", [bData.vehicleId])).toBe(1);
  });

  it("não deixa ligar uma viatura a um cliente de outra oficina", async () => {
    const err = await pgError(
      sql(a.owner, "insert into public.vehicles (customer_id, plate) values ($1, 'XX-99-XX')", [bData.customerId]),
    );
    expect(err.code).toBe("23503");
  });

  it("um utilizador sem oficina não vê nada", async () => {
    const stranger = user(await createUser());
    expect(await sql(stranger, "select id from public.customers")).toEqual([]);
    expect(await sql(stranger, "select id from public.workshops")).toEqual([]);
    const err = await pgError(sql(stranger, "insert into public.customers (name) values ('Sem oficina')"));
    expect(err.code).not.toBe("");
  });

  it("visitantes sem sessão não têm acesso às tabelas de negócio", async () => {
    for (const table of ["customers", "vehicles", "service_orders", "service_order_items"]) {
      const err = await pgError(sql(anon, `select * from public.${table}`));
      expect(err.code, table).toBe("42501");
    }
    expect(await sql(anon, "select id from public.workshops")).toEqual([]);
  });

  it("o mecânico (membro) trabalha nos dados mas não altera a oficina", async () => {
    const mechanicId = await createUser();
    await addMember(a.workshopId, mechanicId, "member");
    const mechanic = user(mechanicId);

    expect(await sql(mechanic, "select id from public.customers")).toHaveLength(1);
    await sql(mechanic, "insert into public.customers (name) values ('Cliente do mecânico')");

    expect(await exec(mechanic, "update public.workshops set name = 'Renomeada' where id = $1", [a.workshopId])).toBe(0);
    expect(await exec(mechanic, "update public.workshops set track_costs = true where id = $1", [a.workshopId])).toBe(0);
  });

  it("o dono altera nome e opção de custos, mas não a faturação", async () => {
    expect(await exec(a.owner, "update public.workshops set name = 'Oficina A, Lda', track_costs = true where id = $1", [a.workshopId])).toBe(1);

    for (const column of ["subscription_status = 'active'", "trial_ends_at = now() + interval '1 year'", "is_demo = true", "admin_notes = 'x'"]) {
      const err = await pgError(sql(a.owner, `update public.workshops set ${column} where id = $1`, [a.workshopId]));
      expect(err.code, column).toBe("42501");
    }
  });

  it("ninguém fora do servidor mexe na lista de membros", async () => {
    const intruder = await createUser();
    const err = await pgError(
      sql(user(intruder), "insert into public.workshop_members (workshop_id, user_id) values ($1, $2)", [a.workshopId, intruder]),
    );
    expect(err.code).toBe("42501");
  });
});

describe("tabelas do site e do admin", () => {
  it("o modo em construção é público para ler e fechado para escrever", async () => {
    expect(await sql(anon, "select under_construction from public.site_settings where id = 1")).toHaveLength(1);
    const err = await pgError(sql(anon, "update public.site_settings set under_construction = false"));
    expect(err.code).toBe("42501");
  });

  it("a lista de interessados e o registo de ações só são acessíveis pelo servidor", async () => {
    const someone = user(await createUser());
    for (const actor of [anon, someone]) {
      expect((await pgError(sql(actor, "select * from public.interessados"))).code).toBe("42501");
      expect((await pgError(sql(actor, "insert into public.interessados (email) values ('a@b.pt')"))).code).toBe("42501");
      expect((await pgError(sql(actor, "select * from public.admin_audit_log"))).code).toBe("42501");
    }
  });
});
