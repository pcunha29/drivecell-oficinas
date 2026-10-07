import { beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  count,
  customerWithVehicle,
  ownerWithWorkshop,
  pgError,
  saveOrder,
  sql,
} from "./helpers";

type ItemRow = {
  position: number;
  description: string;
  quantity: string;
  unit_price: string;
  unit_cost: string | null;
  workshop_id: string;
};

async function items(orderId: string) {
  return sql<ItemRow>(
    admin,
    "select position, description, quantity, unit_price, unit_cost, workshop_id from public.service_order_items where order_id = $1 order by position",
    [orderId],
  );
}

/** save_order grava a ordem e as linhas numa só transação. */
describe("guardar ordem (save_order)", () => {
  let ws: Awaited<ReturnType<typeof ownerWithWorkshop>>;
  let data: Awaited<ReturnType<typeof customerWithVehicle>>;

  beforeAll(async () => {
    ws = await ownerWithWorkshop();
    data = await customerWithVehicle(ws.owner, "OR-12-DM");
  });

  it("cria a ordem com as linhas pela ordem enviada, com e sem custo", async () => {
    const id = await saveOrder(ws.owner, {
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      description: "Pastilhas dianteiras",
      items: [
        { description: "Pastilhas", quantity: 1, unitPrice: 58, unitCost: 31.5 },
        { description: "Mão de obra", quantity: 1.5, unitPrice: 35, unitCost: null },
      ],
    });

    const [order] = await sql<{ status: string; paid: boolean; workshop_id: string }>(
      admin,
      "select status, paid, workshop_id from public.service_orders where id = $1",
      [id],
    );
    expect(order).toEqual({ status: "waiting", paid: false, workshop_id: ws.workshopId });

    expect(await items(id)).toEqual([
      { position: 0, description: "Pastilhas", quantity: "1.00", unit_price: "58.00", unit_cost: "31.50", workshop_id: ws.workshopId },
      { position: 1, description: "Mão de obra", quantity: "1.50", unit_price: "35.00", unit_cost: null, workshop_id: ws.workshopId },
    ]);
  });

  it("ao editar, substitui as linhas; sem linhas (null) mantém; lista vazia apaga", async () => {
    const id = await saveOrder(ws.owner, {
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      description: "Revisão",
      items: [{ description: "Óleo", quantity: 5, unitPrice: 9.5 }],
    });

    await saveOrder(ws.owner, {
      orderId: id,
      customerId: null,
      vehicleId: null,
      status: "in_progress",
      items: [
        { description: "Óleo 5W30", quantity: 4, unitPrice: 9.5, unitCost: 5 },
        { description: "Filtro", quantity: 1, unitPrice: 14, unitCost: "" },
      ],
    });
    let rows = await items(id);
    expect(rows.map((r) => [r.description, r.unit_cost])).toEqual([
      ["Óleo 5W30", "5.00"],
      ["Filtro", null],
    ]);

    // Só muda o estado: as linhas ficam (p_items null).
    await saveOrder(ws.owner, { orderId: id, customerId: null, vehicleId: null, status: "delivered", paid: true, items: null });
    rows = await items(id);
    expect(rows).toHaveLength(2);
    const [order] = await sql<{ status: string; paid: boolean; description: string }>(
      admin,
      "select status, paid, description from public.service_orders where id = $1",
      [id],
    );
    expect(order).toEqual({ status: "delivered", paid: true, description: "Revisão" });

    await saveOrder(ws.owner, { orderId: id, customerId: null, vehicleId: null, items: [] });
    expect(await items(id)).toEqual([]);
  });

  it("se uma linha for inválida, nada fica gravado", async () => {
    const before = await count("public.service_orders", "workshop_id = $1", [ws.workshopId]);
    const err = await pgError(
      saveOrder(ws.owner, {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        description: "Com preço negativo",
        items: [
          { description: "Boa", quantity: 1, unitPrice: 10 },
          { description: "Má", quantity: 1, unitPrice: -5 },
        ],
      }),
    );
    expect(err.code).toBe("23514");
    expect(await count("public.service_orders", "workshop_id = $1", [ws.workshopId])).toBe(before);
  });

  it("recusa custo negativo", async () => {
    const err = await pgError(
      saveOrder(ws.owner, {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        description: "Custo negativo",
        items: [{ description: "Peça", quantity: 1, unitPrice: 10, unitCost: -1 }],
      }),
    );
    expect(err.code).toBe("23514");
  });

  it("não encontra (nem altera) ordens de outra oficina", async () => {
    const other = await ownerWithWorkshop();
    const otherData = await customerWithVehicle(other.owner, "OT-00-HR");
    const otherOrder = await saveOrder(other.owner, {
      customerId: otherData.customerId,
      vehicleId: otherData.vehicleId,
      description: "Ordem da outra oficina",
      items: [{ description: "Peça", quantity: 1, unitPrice: 100 }],
    });

    const err = await pgError(
      saveOrder(ws.owner, { orderId: otherOrder, customerId: null, vehicleId: null, status: "delivered", items: [] }),
    );
    expect(err.message).toContain("order_not_found");
    expect(await items(otherOrder)).toHaveLength(1);
  });

  it("não aceita a viatura de outra oficina numa ordem", async () => {
    const other = await ownerWithWorkshop();
    const otherData = await customerWithVehicle(other.owner, "VV-11-VV");
    const err = await pgError(
      saveOrder(ws.owner, { customerId: data.customerId, vehicleId: otherData.vehicleId, description: "Troca" }),
    );
    expect(err.code).toBe("23503");
  });
});
