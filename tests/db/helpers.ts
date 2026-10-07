import { randomUUID } from "node:crypto";
import { Pool, type QueryResultRow } from "pg";
import { afterAll, inject } from "vitest";

/**
 * Quem faz o pedido, como no Supabase:
 * - user: utilizador com sessão (papel authenticated + JWT com o seu id) → RLS aplica-se;
 * - anon: visitante sem sessão;
 * - service: service role (servidor/admin) → ignora o RLS;
 * - admin: dono da base de dados, só para preparar e verificar dados nos testes.
 */
export type Actor =
  | { kind: "user"; id: string }
  | { kind: "anon" }
  | { kind: "service" }
  | { kind: "admin" };

export const anon: Actor = { kind: "anon" };
export const service: Actor = { kind: "service" };
export const admin: Actor = { kind: "admin" };
export const user = (id: string): Actor => ({ kind: "user", id });

const pool = new Pool({ connectionString: inject("dbUrl"), max: 4, options: "-c TimeZone=UTC" });
afterAll(async () => {
  await pool.end();
});

/** Corre um pedido numa transação própria, como faz o PostgREST. */
export async function sql<T extends QueryResultRow = QueryResultRow>(
  actor: Actor,
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (actor.kind === "user") {
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: actor.id, role: "authenticated" }),
      ]);
    } else if (actor.kind === "anon") {
      await client.query("set local role anon");
    } else if (actor.kind === "service") {
      await client.query("set local role service_role");
    }
    const result = await client.query<T>(text, params);
    await client.query("commit");
    return result.rows;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Como sql(), mas devolve também quantas linhas foram afetadas (update/delete). */
export async function exec(actor: Actor, text: string, params: unknown[] = []): Promise<number> {
  const rows = await sql<{ n: number }>(
    actor,
    `with r as (${text} returning 1) select count(*)::int as n from r`,
    params,
  );
  return rows[0].n;
}

/** Erro do Postgres com o código (ex.: 42501 = sem permissão / RLS). */
export async function pgError(promise: Promise<unknown>): Promise<{ code: string; message: string }> {
  try {
    await promise;
  } catch (error) {
    const e = error as { code?: string; message: string };
    return { code: e.code ?? "", message: e.message };
  }
  throw new Error("Era esperado um erro da base de dados, mas o pedido passou.");
}

// ---------------------------------------------------------------------------
// Dados de teste
// ---------------------------------------------------------------------------

export async function createUser(meta: Record<string, unknown> = {}): Promise<string> {
  const id = randomUUID();
  await sql(admin, "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
    id,
    `teste-${id}@exemplo.pt`,
    meta,
  ]);
  return id;
}

export type WorkshopOptions = {
  name?: string;
  status?: "trialing" | "active" | "past_due" | "canceled";
  /** Fim do teste em dias a partir de agora (negativo = já acabou). */
  trialDays?: number;
  isDemo?: boolean;
};

/** Cria uma oficina com dono, pelo mesmo caminho do admin (service role). */
export async function createWorkshop(
  ownerId: string,
  { name = "Oficina Teste", status = "trialing", trialDays = 14, isDemo = false }: WorkshopOptions = {},
): Promise<string> {
  const [ws] = await sql<{ id: string }>(
    service,
    "select id from public.admin_create_workshop($1, $2, null, null, $3, 14, $4)",
    [ownerId, name, status, isDemo],
  );
  await sql(admin, "update public.workshops set trial_ends_at = now() + make_interval(secs => $2) where id = $1", [
    ws.id,
    trialDays * 86_400,
  ]);
  return ws.id;
}

export async function addMember(workshopId: string, userId: string, role: "owner" | "member" = "member") {
  await sql(admin, "insert into public.workshop_members (workshop_id, user_id, role) values ($1, $2, $3)", [
    workshopId,
    userId,
    role,
  ]);
}

/** Dono + oficina a funcionar (teste a decorrer). */
export async function ownerWithWorkshop(options: WorkshopOptions = {}) {
  const ownerId = await createUser();
  const workshopId = await createWorkshop(ownerId, options);
  return { ownerId, workshopId, owner: user(ownerId) };
}

/** Cliente + viatura criados pelo próprio utilizador (workshop_id preenchido pela base de dados). */
export async function customerWithVehicle(actor: Actor, plate = "AA-00-AA") {
  const [customer] = await sql<{ id: string; workshop_id: string; slug: string }>(
    actor,
    "insert into public.customers (name) values ('Cliente Teste') returning id, workshop_id, slug",
  );
  const [vehicle] = await sql<{ id: string }>(
    actor,
    "insert into public.vehicles (customer_id, plate, make, model, year) values ($1, $2, 'Renault', 'Clio', 2019) returning id",
    [customer.id, plate],
  );
  return { customerId: customer.id, vehicleId: vehicle.id, slug: customer.slug };
}

export type SaveOrderInput = {
  orderId?: string | null;
  customerId: string | null;
  vehicleId: string | null;
  status?: string | null;
  description?: string | null;
  notes?: string | null;
  paid?: boolean | null;
  items?: unknown[] | null;
  /** Datas de entrada/saída: chave presente = grava (null apaga); ausente = não mexe. */
  dates?: { checkedInAt?: string | null; checkedOutAt?: string | null } | null;
};

/** Chama o RPC save_order com os mesmos parâmetros que a app (src/lib/repositories/orders.ts). */
export async function saveOrder(actor: Actor, input: SaveOrderInput): Promise<string> {
  const [row] = await sql<{ id: string }>(
    actor,
    "select public.save_order($1, $2, $3, $4, $5, $6, $7, $8, $9) as id",
    [
      input.orderId ?? null,
      input.customerId,
      input.vehicleId,
      input.status ?? null,
      input.description ?? null,
      input.notes ?? null,
      input.paid ?? null,
      input.items === undefined || input.items === null ? null : JSON.stringify(input.items),
      input.dates ? JSON.stringify(input.dates) : null,
    ],
  );
  return row.id;
}

export async function count(table: string, where = "true", params: unknown[] = []): Promise<number> {
  const [row] = await sql<{ n: number }>(admin, `select count(*)::int as n from ${table} where ${where}`, params);
  return row.n;
}
