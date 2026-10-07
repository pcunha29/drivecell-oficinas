import { describe, expect, it } from "vitest";
import {
  admin,
  count,
  customerWithVehicle,
  exec,
  ownerWithWorkshop,
  pgError,
  saveOrder,
  sql,
} from "./helpers";

async function seedOrder(ws: Awaited<ReturnType<typeof ownerWithWorkshop>>, plate: string) {
  const data = await customerWithVehicle(ws.owner, plate);
  const orderId = await saveOrder(ws.owner, {
    customerId: data.customerId,
    vehicleId: data.vehicleId,
    description: "Discos e pastilhas",
    items: [
      { description: "Discos", quantity: 2, unitPrice: 64 },
      { description: "Pastilhas", quantity: 1, unitPrice: 58 },
    ],
  });
  return { ...data, orderId };
}

describe("apagar em cascata", () => {
  it("apagar um cliente apaga as viaturas, as ordens e as linhas dele", async () => {
    const ws = await ownerWithWorkshop();
    const keep = await seedOrder(ws, "KE-EP-01");
    const gone = await seedOrder(ws, "GO-NE-01");

    expect(await exec(ws.owner, "delete from public.customers where id = $1", [gone.customerId])).toBe(1);

    expect(await count("public.vehicles", "id = $1", [gone.vehicleId])).toBe(0);
    expect(await count("public.service_orders", "id = $1", [gone.orderId])).toBe(0);
    expect(await count("public.service_order_items", "order_id = $1", [gone.orderId])).toBe(0);

    // O resto da oficina fica intacto.
    expect(await count("public.customers", "id = $1", [keep.customerId])).toBe(1);
    expect(await count("public.service_order_items", "order_id = $1", [keep.orderId])).toBe(2);
  });

  it("apagar uma viatura apaga as ordens dela, mas não o cliente", async () => {
    const ws = await ownerWithWorkshop();
    const data = await seedOrder(ws, "VI-AT-01");

    expect(await exec(ws.owner, "delete from public.vehicles where id = $1", [data.vehicleId])).toBe(1);
    expect(await count("public.service_orders", "id = $1", [data.orderId])).toBe(0);
    expect(await count("public.service_order_items", "order_id = $1", [data.orderId])).toBe(0);
    expect(await count("public.customers", "id = $1", [data.customerId])).toBe(1);
  });

  it("apagar uma ordem apaga as linhas", async () => {
    const ws = await ownerWithWorkshop();
    const data = await seedOrder(ws, "OR-DE-01");

    expect(await exec(ws.owner, "delete from public.service_orders where id = $1", [data.orderId])).toBe(1);
    expect(await count("public.service_order_items", "order_id = $1", [data.orderId])).toBe(0);
    expect(await count("public.vehicles", "id = $1", [data.vehicleId])).toBe(1);
  });

  it("eliminar a oficina (admin) apaga tudo o que é dela, mas mantém o utilizador", async () => {
    const ws = await ownerWithWorkshop();
    const data = await seedOrder(ws, "WS-DE-01");

    await sql(admin, "delete from public.workshops where id = $1", [ws.workshopId]);

    for (const table of ["customers", "vehicles", "service_orders", "service_order_items", "workshop_members"]) {
      expect(await count(`public.${table}`, "workshop_id = $1", [ws.workshopId]), table).toBe(0);
    }
    expect(await count("public.service_orders", "id = $1", [data.orderId])).toBe(0);
    expect(await count("auth.users", "id = $1", [ws.ownerId])).toBe(1);
  });

  it("um registo não muda de oficina", async () => {
    const a = await ownerWithWorkshop();
    const b = await ownerWithWorkshop();
    const data = await seedOrder(a, "MV-00-01");

    for (const table of ["customers", "vehicles", "service_orders"]) {
      const id = table === "customers" ? data.customerId : table === "vehicles" ? data.vehicleId : data.orderId;
      // Mesmo o dono da base de dados (que ignora o RLS) é travado pelo trigger.
      const err = await pgError(sql(admin, `update public.${table} set workshop_id = $1 where id = $2`, [b.workshopId, id]));
      expect(err.message, table).toContain("workshop_id is immutable");
    }
  });
});
