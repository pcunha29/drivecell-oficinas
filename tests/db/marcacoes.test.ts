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
  saveOrder,
  service,
  sql,
  user,
} from "./helpers";

type AppointmentRow = {
  id: string;
  workshop_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  created_by: string | null;
  start_time: string | null;
  end_time: string | null;
};

const INSERT =
  "insert into public.appointments (service_type, customer_name, day, start_time, end_time, plate, phone, customer_id, vehicle_id) " +
  "values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *";

type NewAppointment = {
  serviceType?: string;
  customerName?: string;
  day?: string;
  start?: string | null;
  end?: string | null;
  plate?: string;
  phone?: string;
  customerId?: string | null;
  vehicleId?: string | null;
};

function insertParams(a: NewAppointment = {}) {
  return [
    a.serviceType ?? "Lavagem",
    a.customerName ?? "Sr. João",
    a.day ?? "2026-11-10",
    a.start === undefined ? "09:00" : a.start,
    a.end ?? null,
    a.plate ?? "",
    a.phone ?? "",
    a.customerId ?? null,
    a.vehicleId ?? null,
  ];
}

describe("marcações", () => {
  let a: Awaited<ReturnType<typeof ownerWithWorkshop>>;
  let b: Awaited<ReturnType<typeof ownerWithWorkshop>>;
  let bData: Awaited<ReturnType<typeof customerWithVehicle>>;

  const create = async (actor = a.owner, input: NewAppointment = {}) =>
    (await sql<AppointmentRow>(actor, INSERT, insertParams(input)))[0];

  beforeAll(async () => {
    a = await ownerWithWorkshop({ name: "Oficina A" });
    b = await ownerWithWorkshop({ name: "Oficina B" });
    bData = await customerWithVehicle(b.owner, "MB-22-BB");
  });

  it("cria nos três modos de hora e preenche oficina e autor", async () => {
    const point = await create(a.owner, { start: "09:30" });
    const range = await create(a.owner, { start: "14:00", end: "16:30" });
    const allDay = await create(a.owner, { start: null });
    expect(point).toMatchObject({ workshop_id: a.workshopId, created_by: a.ownerId, start_time: "09:30:00", end_time: null });
    expect(range).toMatchObject({ start_time: "14:00:00", end_time: "16:30:00" });
    expect(allDay).toMatchObject({ start_time: null, end_time: null });
  });

  it("o autor é sempre quem cria e não muda depois", async () => {
    const other = await createUser();
    const [row] = await sql<AppointmentRow>(
      a.owner,
      "insert into public.appointments (service_type, customer_name, day, created_by) values ('Revisão', 'Ana', '2026-11-10', $1) returning *",
      [other],
    );
    expect(row.created_by).toBe(a.ownerId);
    await exec(a.owner, "update public.appointments set created_by = $2 where id = $1", [row.id, other]);
    const [after] = await sql<AppointmentRow>(admin, "select created_by from public.appointments where id = $1", [row.id]);
    expect(after.created_by).toBe(a.ownerId);
  });

  it("um mecânico (membro) também cria marcações", async () => {
    const mechanic = await createUser();
    await addMember(a.workshopId, mechanic, "member");
    const row = await create(user(mechanic));
    expect(row.workshop_id).toBe(a.workshopId);
  });

  it("cada oficina só vê as suas marcações", async () => {
    const mine = await create(a.owner, { customerName: "Só da A" });
    const theirs = await create(b.owner, { customerName: "Só da B" });
    const seen = (await sql<{ id: string }>(a.owner, "select id from public.appointments")).map((r) => r.id);
    expect(seen).toContain(mine.id);
    expect(seen).not.toContain(theirs.id);
  });

  it("não deixa criar, alterar nem apagar marcações de outra oficina", async () => {
    const theirs = await create(b.owner);
    const err = await pgError(
      sql(a.owner, "insert into public.appointments (workshop_id, service_type, customer_name, day) values ($1, 'X', 'Y', '2026-11-10')", [
        b.workshopId,
      ]),
    );
    expect(err.code).toBe("42501");
    expect(await exec(a.owner, "update public.appointments set customer_name = 'Alterado' where id = $1", [theirs.id])).toBe(0);
    expect(await exec(a.owner, "delete from public.appointments where id = $1", [theirs.id])).toBe(0);
    expect(await count("public.appointments", "id = $1 and customer_name = 'Sr. João'", [theirs.id])).toBe(1);
  });

  it("não deixa ligar a um cliente ou viatura de outra oficina", async () => {
    expect((await pgError(create(a.owner, { customerId: bData.customerId }))).code).toBe("23503");
    expect((await pgError(create(a.owner, { vehicleId: bData.vehicleId }))).code).toBe("23503");
  });

  it("não deixa mudar a marcação de oficina", async () => {
    const mine = await create(a.owner);
    const err = await pgError(sql(admin, "update public.appointments set workshop_id = $2 where id = $1", [mine.id, b.workshopId]));
    expect(err.code).toBe("42501");
  });

  it("visitantes sem sessão não leem nada", async () => {
    expect((await pgError(sql(anon, "select id from public.appointments"))).code).toBe("42501");
  });

  it("valida os campos na base de dados", async () => {
    const invalid: NewAppointment[] = [
      { start: "10:00", end: "10:00" },
      { start: "10:00", end: "09:00" },
      { start: null, end: "10:00" },
      { serviceType: "  " },
      { customerName: "" },
      { customerName: "x".repeat(121) },
      { plate: "x".repeat(21) },
      { phone: "9".repeat(31) },
      { day: "1999-12-31" },
    ];
    for (const input of invalid) {
      expect((await pgError(create(a.owner, input))).code).toBe("23514");
    }
    expect((await pgError(sql(a.owner, "update public.appointments set status = 'feito'"))).code).toBe("23514");
  });

  it("apagar o cliente ou a viatura mantém a marcação e só desfaz a ligação", async () => {
    const data = await customerWithVehicle(a.owner, "MA-33-CC");
    const linked = await create(a.owner, { customerId: data.customerId, vehicleId: data.vehicleId, plate: "MA-33-CC" });
    await exec(a.owner, "delete from public.vehicles where id = $1", [data.vehicleId]);
    let [row] = await sql<AppointmentRow>(admin, "select * from public.appointments where id = $1", [linked.id]);
    expect(row).toMatchObject({ workshop_id: a.workshopId, customer_id: data.customerId, vehicle_id: null });

    await exec(a.owner, "delete from public.customers where id = $1", [data.customerId]);
    [row] = await sql<AppointmentRow>(admin, "select * from public.appointments where id = $1", [linked.id]);
    expect(row).toMatchObject({ workshop_id: a.workshopId, customer_id: null, vehicle_id: null });
  });

  it("uma conta em só-leitura vê mas não cria, altera nem apaga", async () => {
    const ro = await ownerWithWorkshop({ status: "trialing", trialDays: 5 });
    const existing = await create(ro.owner);
    await sql(admin, "update public.workshops set trial_ends_at = now() - interval '1 day' where id = $1", [ro.workshopId]);

    expect(await sql(ro.owner, "select id from public.appointments")).toHaveLength(1);
    expect((await pgError(create(ro.owner))).code).toBe("42501");
    expect(await exec(ro.owner, "update public.appointments set status = 'canceled' where id = $1", [existing.id])).toBe(0);
    expect(await exec(ro.owner, "delete from public.appointments where id = $1", [existing.id])).toBe(0);
  });

  it("apagar a oficina apaga as marcações", async () => {
    const gone = await ownerWithWorkshop();
    await create(gone.owner);
    await create(gone.owner);
    await sql(service, "delete from public.workshops where id = $1", [gone.workshopId]);
    expect(await count("public.appointments", "workshop_id = $1", [gone.workshopId])).toBe(0);
  });
});

describe("opção Marcações por oficina", () => {
  it("vem ligada e só o admin a muda (nem o dono, nem um mecânico)", async () => {
    const ws = await ownerWithWorkshop();
    const mechanic = await createUser();
    await addMember(ws.workshopId, mechanic, "member");

    const [row] = await sql<{ calendar_enabled: boolean }>(ws.owner, "select calendar_enabled from public.workshops");
    expect(row.calendar_enabled).toBe(true);

    for (const actor of [ws.owner, user(mechanic)]) {
      const err = await pgError(exec(actor, "update public.workshops set calendar_enabled = false where id = $1", [ws.workshopId]));
      expect(err.code).toBe("42501");
    }

    expect(await exec(service, "update public.workshops set calendar_enabled = false where id = $1", [ws.workshopId])).toBe(1);
  });
});

describe("chegada prevista nas ordens (save_order)", () => {
  let ws: Awaited<ReturnType<typeof ownerWithWorkshop>>;
  let data: Awaited<ReturnType<typeof customerWithVehicle>>;

  type Expected = { expected_on: string | null; expected_time: string | null };
  const expected = async (id: string) =>
    (
      await sql<Expected>(
        admin,
        "select to_char(expected_on, 'YYYY-MM-DD') as expected_on, expected_time::text from public.service_orders where id = $1",
        [id],
      )
    )[0];

  beforeAll(async () => {
    ws = await ownerWithWorkshop();
    data = await customerWithVehicle(ws.owner, "CH-01-PR");
  });

  it("grava a data e a hora ao criar, e só a data sem hora", async () => {
    const withTime = await saveOrder(ws.owner, {
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      dates: { expectedOn: "2026-11-12", expectedTime: "09:30" },
    });
    expect(await expected(withTime)).toEqual({ expected_on: "2026-11-12", expected_time: "09:30:00" });

    const dateOnly = await saveOrder(ws.owner, {
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      dates: { expectedOn: "2026-11-13" },
    });
    expect(await expected(dateOnly)).toEqual({ expected_on: "2026-11-13", expected_time: null });
  });

  it("chave ausente não mexe; null apaga", async () => {
    const id = await saveOrder(ws.owner, {
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      dates: { expectedOn: "2026-11-12", expectedTime: "09:30" },
    });

    // Sem p_dates (como a app quando a opção Marcações está desligada).
    await saveOrder(ws.owner, { orderId: id, customerId: null, vehicleId: null, description: "Outra" });
    await saveOrder(ws.owner, { orderId: id, customerId: null, vehicleId: null, dates: { checkedInAt: null } });
    expect(await expected(id)).toEqual({ expected_on: "2026-11-12", expected_time: "09:30:00" });

    await saveOrder(ws.owner, { orderId: id, customerId: null, vehicleId: null, dates: { expectedTime: null } });
    expect(await expected(id)).toEqual({ expected_on: "2026-11-12", expected_time: null });

    await saveOrder(ws.owner, { orderId: id, customerId: null, vehicleId: null, dates: { expectedOn: null } });
    expect(await expected(id)).toEqual({ expected_on: null, expected_time: null });
  });

  it("não aceita hora sem data", async () => {
    const err = await pgError(
      saveOrder(ws.owner, { customerId: data.customerId, vehicleId: data.vehicleId, dates: { expectedTime: "10:00" } }),
    );
    expect(err.code).toBe("23514");
  });

  it("continua com uma só versão do save_order, sem acesso para visitantes", async () => {
    const rows = await sql<{ n: number; anon: boolean }>(
      admin,
      `select count(*)::int as n,
              bool_or(has_function_privilege('anon', p.oid, 'execute')) as anon
         from pg_proc p where p.proname = 'save_order' and p.pronamespace = 'public'::regnamespace`,
    );
    expect(rows[0]).toEqual({ n: 1, anon: false });
  });
});

describe("marcações na demonstração", () => {
  it("repor a demo cria marcações e chegadas previstas, sem duplicar", async () => {
    const ws = await ownerWithWorkshop({ isDemo: true });
    await sql(service, "select public.seed_demo_data($1)", [ws.workshopId]);
    await sql(service, "select public.seed_demo_data($1)", [ws.workshopId]);

    expect(await count("public.appointments", "workshop_id = $1", [ws.workshopId])).toBe(10);
    expect(await count("public.appointments", "workshop_id = $1 and start_time is null", [ws.workshopId])).toBe(2);
    expect(await count("public.appointments", "workshop_id = $1 and end_time is not null", [ws.workshopId])).toBe(4);
    expect(
      await count("public.service_orders", "workshop_id = $1 and status = 'waiting' and expected_on is not null", [ws.workshopId]),
    ).toBe(3);
  });

  it("só o admin repõe (a função base também não está aberta)", async () => {
    const ws = await ownerWithWorkshop({ isDemo: true });
    expect((await pgError(sql(ws.owner, "select public.seed_demo_data($1)", [ws.workshopId]))).code).toBe("42501");
    expect((await pgError(sql(ws.owner, "select public.seed_demo_base($1)", [ws.workshopId]))).code).toBe("42501");
  });
});
