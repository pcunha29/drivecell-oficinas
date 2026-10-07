import { describe, expect, it } from "vitest";
import {
  addMember,
  admin,
  count,
  createUser,
  createWorkshop,
  customerWithVehicle,
  pgError,
  service,
  sql,
  user,
} from "./helpers";

async function cancelDaysAgo(workshopId: string, days: number, periodEndDaysAgo: number | null = null) {
  await sql(admin, "update public.workshops set subscription_status = 'canceled' where id = $1", [workshopId]);
  await sql(
    admin,
    `update public.workshops
        set canceled_at = now() - make_interval(days => $2),
            current_period_end = case when $3::int is null then null else now() - make_interval(days => $3::int) end
      where id = $1`,
    [workshopId, days, periodEndDaysAgo],
  );
}

describe("data de cancelamento", () => {
  it("é marcada ao cancelar e limpa ao reativar", async () => {
    const workshopId = await createWorkshop(await createUser(), { status: "active" });
    const read = async () =>
      (await sql<{ canceled_at: Date | null }>(admin, "select canceled_at from public.workshops where id = $1", [workshopId]))[0]
        .canceled_at;

    expect(await read()).toBeNull();
    await sql(admin, "update public.workshops set subscription_status = 'canceled' where id = $1", [workshopId]);
    const canceledAt = await read();
    expect(canceledAt).toBeInstanceOf(Date);
    expect(Math.abs(Date.now() - canceledAt!.getTime())).toBeLessThan(60_000);

    await sql(admin, "update public.workshops set subscription_status = 'active' where id = $1", [workshopId]);
    expect(await read()).toBeNull();
  });

  it("conta 90 dias a partir do fim do acesso (o mais tarde entre cancelamento e fim do período pago)", async () => {
    const [row] = await sql<{ a: Date; b: Date }>(
      admin,
      `select public.workshop_purge_date('2026-01-01', null) as a,
              public.workshop_purge_date('2026-01-01', '2026-03-01') as b`,
    );
    expect(row.a.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(row.b.toISOString().slice(0, 10)).toBe("2026-05-30");
  });
});

describe("eliminação automática 90 dias depois (purge_canceled_workshops)", () => {
  it("apaga só as oficinas canceladas há mais de 90 dias, e os utilizadores que ficam sem oficina", async () => {
    // Para apagar: cancelada há 91 dias, sem período pago.
    const oldOwner = await createUser();
    const old = await createWorkshop(oldOwner);
    await customerWithVehicle(user(oldOwner), "PU-RG-01");
    // O mecânico desta oficina também trabalha noutra: fica.
    const sharedMechanic = await createUser();
    await addMember(old, sharedMechanic);
    const active = await createWorkshop(await createUser(), { status: "active" });
    await addMember(active, sharedMechanic);
    await cancelDaysAgo(old, 91);

    // Para manter: período pago acabou há 30 dias (faltam 60).
    const paidUntil = await createWorkshop(await createUser());
    await cancelDaysAgo(paidUntil, 91, 30);
    // Para manter: cancelada há 10 dias.
    const recent = await createWorkshop(await createUser());
    await cancelDaysAgo(recent, 10);
    // Para manter: demonstração, mesmo cancelada há muito.
    const demo = await createWorkshop(await createUser(), { isDemo: true });
    await cancelDaysAgo(demo, 400);

    const [{ purged }] = await sql<{ purged: number }>(service, "select public.purge_canceled_workshops() as purged");
    expect(purged).toBe(1);

    expect(await count("public.workshops", "id = $1", [old])).toBe(0);
    expect(await count("public.customers", "workshop_id = $1", [old])).toBe(0);
    expect(await count("auth.users", "id = $1", [oldOwner])).toBe(0);
    expect(await count("auth.users", "id = $1", [sharedMechanic])).toBe(1);

    for (const kept of [active, paidUntil, recent, demo]) {
      expect(await count("public.workshops", "id = $1", [kept])).toBe(1);
    }

    const [log] = await sql<{ actor: string; details: { deleted_users: number } }>(
      admin,
      "select actor, details from public.admin_audit_log where action = 'workshop.purge' and workshop_id = $1",
      [old],
    );
    expect(log.actor).toBe("sistema");
    expect(log.details.deleted_users).toBe(1);

    // Correr outra vez não apaga mais nada.
    const [{ purged: again }] = await sql<{ purged: number }>(service, "select public.purge_canceled_workshops() as purged");
    expect(again).toBe(0);
  });

  it("os clientes da app não conseguem chamar a eliminação", async () => {
    const someone = user(await createUser());
    expect((await pgError(sql(someone, "select public.purge_canceled_workshops()"))).code).toBe("42501");
  });
});
