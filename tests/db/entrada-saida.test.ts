import { beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  createUser,
  createWorkshop,
  customerWithVehicle,
  exec,
  ownerWithWorkshop,
  pgError,
  saveOrder,
  sql,
} from "./helpers";

type Stay = { status: string; checked_in_at: Date | null; checked_out_at: Date | null };

async function stay(orderId: string): Promise<Stay> {
  const [row] = await sql<Stay>(admin, "select status, checked_in_at, checked_out_at from public.service_orders where id = $1", [orderId]);
  return row;
}

const recent = (d: Date | null) => d !== null && Math.abs(Date.now() - d.getTime()) < 60_000;

describe("entrada e saída das viaturas", () => {
  let ws: Awaited<ReturnType<typeof ownerWithWorkshop>>;
  let data: Awaited<ReturnType<typeof customerWithVehicle>>;
  const newOrder = (extra: Partial<Parameters<typeof saveOrder>[1]> = {}) =>
    saveOrder(ws.owner, { customerId: data.customerId, vehicleId: data.vehicleId, description: "Travões", ...extra });

  beforeAll(async () => {
    ws = await ownerWithWorkshop();
    data = await customerWithVehicle(ws.owner, "EN-TR-01");
  });

  it("uma ordem em espera ainda não tem entrada", async () => {
    const id = await newOrder();
    expect(await stay(id)).toMatchObject({ checked_in_at: null, checked_out_at: null });
  });

  it("marca a entrada ao passar a Em curso e a saída ao entregar (também pelo quadro)", async () => {
    const id = await newOrder();
    await exec(ws.owner, "update public.service_orders set status = 'in_progress' where id = $1", [id]);
    let s = await stay(id);
    expect(recent(s.checked_in_at)).toBe(true);
    expect(s.checked_out_at).toBeNull();

    const entry = s.checked_in_at!.getTime();
    await exec(ws.owner, "update public.service_orders set status = 'done' where id = $1", [id]);
    await exec(ws.owner, "update public.service_orders set status = 'delivered' where id = $1", [id]);
    s = await stay(id);
    expect(s.checked_in_at!.getTime()).toBe(entry);
    expect(recent(s.checked_out_at)).toBe(true);
  });

  it("se a ordem saltar logo para entregue, marca entrada e saída", async () => {
    const id = await newOrder({ status: "delivered" });
    const s = await stay(id);
    expect(recent(s.checked_in_at)).toBe(true);
    expect(recent(s.checked_out_at)).toBe(true);
  });

  it("voltar atrás depois de entregue apaga a saída e mantém a entrada", async () => {
    const id = await newOrder({ status: "delivered" });
    await saveOrder(ws.owner, { orderId: id, customerId: null, vehicleId: null, status: "done" });
    const s = await stay(id);
    expect(s.checked_in_at).not.toBeNull();
    expect(s.checked_out_at).toBeNull();
  });

  it("as datas corrigidas à mão ficam, mesmo quando o estado muda", async () => {
    const entry = "2026-09-01T08:30:00.000Z";
    const exit = "2026-09-03T17:00:00.000Z";
    const id = await newOrder({ dates: { checkedInAt: entry } });
    expect((await stay(id)).checked_in_at?.toISOString()).toBe(entry);

    await saveOrder(ws.owner, { orderId: id, customerId: null, vehicleId: null, status: "delivered", dates: { checkedOutAt: exit } });
    let s = await stay(id);
    expect(s.checked_in_at?.toISOString()).toBe(entry);
    expect(s.checked_out_at?.toISOString()).toBe(exit);

    // Gravar sem datas (p_dates null) não mexe nelas.
    await saveOrder(ws.owner, { orderId: id, customerId: null, vehicleId: null, notes: "Cliente pagou", dates: null });
    s = await stay(id);
    expect(s.checked_out_at?.toISOString()).toBe(exit);

    // Apagar a entrada à mão (null) é permitido.
    await saveOrder(ws.owner, { orderId: id, customerId: null, vehicleId: null, dates: { checkedInAt: null } });
    expect((await stay(id)).checked_in_at).toBeNull();
  });

  it("não aceita saída antes da entrada", async () => {
    const id = await newOrder({ status: "delivered" });
    const err = await pgError(
      saveOrder(ws.owner, {
        orderId: id,
        customerId: null,
        vehicleId: null,
        dates: { checkedInAt: "2026-09-10T10:00:00Z", checkedOutAt: "2026-09-09T10:00:00Z" },
      }),
    );
    expect(err.code).toBe("23514");
  });

  it("a saída só existe nas ordens entregues", async () => {
    const id = await newOrder({ status: "in_progress", dates: { checkedOutAt: "2026-09-09T10:00:00Z" } });
    expect((await stay(id)).checked_out_at).toBeNull();
  });
});

describe("demonstração com entradas e saídas", () => {
  it("tem carros na oficina, um parado há 9 dias e estadias nas entregues", async () => {
    const workshopId = await createWorkshop(await createUser(), { isDemo: true, status: "active" });
    const rows = await sql<{ status: string; days_in: number | null; stay_days: number | null }>(
      admin,
      `select status,
              extract(epoch from now() - checked_in_at) / 86400 as days_in,
              extract(epoch from checked_out_at - checked_in_at) / 86400 as stay_days
         from public.service_orders where workshop_id = $1`,
      [workshopId],
    );
    const waiting = rows.filter((r) => r.status === "waiting");
    const inWorkshop = rows.filter((r) => r.status === "in_progress" || r.status === "done");
    const delivered = rows.filter((r) => r.status === "delivered");

    expect(waiting.every((r) => r.days_in === null)).toBe(true);
    expect(inWorkshop.length).toBe(5);
    expect(inWorkshop.every((r) => r.days_in !== null)).toBe(true);
    expect(inWorkshop.some((r) => Number(r.days_in) > 8.5)).toBe(true);
    expect(delivered.every((r) => Number(r.stay_days) >= 1 && Number(r.stay_days) <= 5)).toBe(true);
  });
});
