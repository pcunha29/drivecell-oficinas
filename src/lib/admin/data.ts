import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { TERMS_VERSION } from "@/content/legal";
import { ACTIVITY_DAYS } from "./format";

/** Leituras do admin (service role). Só chamar depois de requireAdmin/requireAdminPage. */

export type AdminWorkshop = {
  id: string;
  name: string;
  phone: string | null;
  nif: string | null;
  subscription_status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  is_demo: boolean;
  /** Menu Marcações visível na app da oficina. */
  calendar_enabled: boolean;
  admin_notes: string;
  created_at: string;
  /** Preenchido pela BD quando o estado passa a "canceled". */
  canceled_at: string | null;
};

export type AdminWorkshopListItem = AdminWorkshop & {
  ownerEmails: string[];
  customerCount: number;
  orderCount: number;
  /** Ordens criadas ou alteradas nos últimos ACTIVITY_DAYS dias (a oficina está a usar a app?). null = não foi possível contar. */
  recentOrderCount: number | null;
};

export type AdminMember = {
  userId: string;
  role: string;
  email: string | null;
  fullName: string | null;
  invitedAt: string | null;
  confirmedAt: string | null;
  lastSignInAt: string | null;
  /** Quando aceitou a versão atual dos termos (null = ainda não aceitou). */
  termsAcceptedAt: string | null;
};

export type AdminWorkshopDetail = AdminWorkshop & {
  customerCount: number;
  orderCount: number;
  recentOrderCount: number | null;
  members: AdminMember[];
};

const WORKSHOP_COLUMNS =
  "id, name, phone, nif, subscription_status, trial_ends_at, current_period_end, is_demo, calendar_enabled, admin_notes, created_at, canceled_at";

type CountEmbed = { count: number }[] | null | undefined;
type MemberEmbed = { user_id: string; role: string }[] | null | undefined;

type WorkshopWithEmbeds = AdminWorkshop & {
  customers?: CountEmbed;
  service_orders?: CountEmbed;
  recent_orders?: CountEmbed;
  workshop_members?: MemberEmbed;
};

function embeddedCount(value: CountEmbed): number {
  return value?.[0]?.count ?? 0;
}

/** Contagens embebidas: clientes, ordens e membros (+ ordens com movimento recente, à parte). */
const WORKSHOP_EMBEDS = "customers(count), service_orders(count), workshop_members(user_id, role)";
const RECENT_ORDERS_EMBED = "recent_orders:service_orders(count)";

/** Início da janela de atividade (ISO). O filtro aplica-se só à contagem recent_orders. */
function activitySince(): string {
  return new Date(Date.now() - ACTIVITY_DAYS * 86_400_000).toISOString();
}

const USERS_PER_PAGE = 1000;
const MAX_USER_PAGES = 50;

/** Todos os utilizadores do Auth (paginando listUsers). */
export async function listAllUsers(admin: SupabaseClient): Promise<User[]> {
  const all: User[] = [];
  for (let page = 1; page <= MAX_USER_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });
    if (error) throw new Error(`Erro ao listar utilizadores: ${error.message}`);
    all.push(...data.users);
    if (data.users.length < USERS_PER_PAGE) break;
  }
  return all;
}

/** Procura um utilizador pelo email (paginando listUsers; pára no primeiro encontrado). */
export async function findUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= MAX_USER_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });
    if (error) throw new Error(`Erro ao procurar utilizador: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < USERS_PER_PAGE) break;
  }
  return null;
}

/** Oficina a que o utilizador já pertence (se alguma). */
export async function findMembershipForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<{ workshopId: string; workshopName: string } | null> {
  const { data, error } = await admin
    .from("workshop_members")
    .select("workshop_id, workshops(name)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Erro ao verificar oficinas do utilizador: ${error.message}`);
  if (!data) return null;
  const embed = data.workshops as unknown as { name: string } | { name: string }[] | null;
  const name = Array.isArray(embed) ? embed[0]?.name : embed?.name;
  return { workshopId: data.workshop_id as string, workshopName: name ?? "sem nome" };
}

/**
 * Oficinas com as contagens. Primeiro tenta incluir a atividade recente (contagem filtrada
 * por updated_at); se essa consulta falhar, carrega sem ela — o admin nunca parte por causa
 * da métrica (recentOrderCount fica null).
 */
async function selectWorkshops(admin: SupabaseClient, id?: string) {
  const run = (withRecent: boolean) => {
    let query = admin
      .from("workshops")
      .select(`${WORKSHOP_COLUMNS}, ${WORKSHOP_EMBEDS}${withRecent ? `, ${RECENT_ORDERS_EMBED}` : ""}`);
    if (withRecent) query = query.gte("recent_orders.updated_at", activitySince());
    if (id) query = query.eq("id", id);
    return query.order("created_at", { ascending: false });
  };
  const withRecent = await run(true);
  if (!withRecent.error) return { ...withRecent, hasRecent: true };
  console.warn("[admin] Contagem de atividade indisponível:", withRecent.error.message);
  return { ...(await run(false)), hasRecent: false };
}

export async function listWorkshops(): Promise<AdminWorkshopListItem[]> {
  const admin = createAdminClient();
  const { data, error, hasRecent } = await selectWorkshops(admin);
  if (error) throw new Error(`Erro ao carregar oficinas: ${error.message}`);

  const rows = (data ?? []) as unknown as WorkshopWithEmbeds[];
  const emailById = new Map<string, string>();
  if (rows.length > 0) {
    for (const user of await listAllUsers(admin)) {
      if (user.email) emailById.set(user.id, user.email);
    }
  }

  return rows.map(({ customers, service_orders, recent_orders, workshop_members, ...workshop }) => ({
    ...workshop,
    customerCount: embeddedCount(customers),
    orderCount: embeddedCount(service_orders),
    recentOrderCount: hasRecent ? embeddedCount(recent_orders) : null,
    ownerEmails: (workshop_members ?? [])
      .filter((m) => m.role === "owner")
      .map((m) => emailById.get(m.user_id) ?? "(utilizador apagado)"),
  }));
}

export async function hasDemoWorkshop(admin?: SupabaseClient): Promise<boolean> {
  const client = admin ?? createAdminClient();
  const { data, error } = await client
    .from("workshops")
    .select("id")
    .eq("is_demo", true)
    .limit(1);
  if (error) throw new Error(`Erro ao verificar oficina de demonstração: ${error.message}`);
  return (data ?? []).length > 0;
}

export async function getWorkshopDetail(id: string): Promise<AdminWorkshopDetail | null> {
  const admin = createAdminClient();
  const { data: rows, error, hasRecent } = await selectWorkshops(admin, id);
  const data = rows?.[0] ?? null;
  if (error) throw new Error(`Erro ao carregar a oficina: ${error.message}`);
  if (!data) return null;

  const { customers, service_orders, recent_orders, workshop_members, ...workshop } =
    data as unknown as WorkshopWithEmbeds;

  const memberIds = (workshop_members ?? []).map((m) => m.user_id);
  // Sem a migração da aceitação dos termos a consulta falha: fica tudo como "por aceitar".
  const { data: acceptances } = memberIds.length
    ? await admin
        .from("terms_acceptances")
        .select("user_id, accepted_at")
        .eq("version", TERMS_VERSION)
        .in("user_id", memberIds)
    : { data: [] };
  const acceptedAt = new Map(
    ((acceptances ?? []) as { user_id: string; accepted_at: string }[]).map((a) => [a.user_id, a.accepted_at]),
  );

  const members = await Promise.all(
    (workshop_members ?? []).map(async (m): Promise<AdminMember> => {
      const { data: userData } = await admin.auth.admin.getUserById(m.user_id);
      const user = userData?.user ?? null;
      const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
      return {
        userId: m.user_id,
        role: m.role,
        email: user?.email ?? null,
        fullName: typeof meta.full_name === "string" ? meta.full_name : null,
        invitedAt: user?.invited_at ?? null,
        confirmedAt: user?.email_confirmed_at ?? user?.confirmed_at ?? null,
        lastSignInAt: user?.last_sign_in_at ?? null,
        termsAcceptedAt: acceptedAt.get(m.user_id) ?? null,
      };
    }),
  );
  members.sort((a, b) => (a.role === b.role ? 0 : a.role === "owner" ? -1 : 1));

  return {
    ...workshop,
    customerCount: embeddedCount(customers),
    orderCount: embeddedCount(service_orders),
    recentOrderCount: hasRecent ? embeddedCount(recent_orders) : null,
    members,
  };
}


/** Data em que a retenção de 90 dias elimina a oficina (espelha workshop_purge_date na BD). */
export function purgeDate(workshop: Pick<AdminWorkshop, "subscription_status" | "canceled_at" | "current_period_end" | "is_demo">): Date | null {
  if (workshop.subscription_status !== "canceled" || !workshop.canceled_at || workshop.is_demo) return null;
  const canceled = new Date(workshop.canceled_at).getTime();
  const periodEnd = workshop.current_period_end ? new Date(workshop.current_period_end).getTime() : canceled;
  return new Date(Math.max(canceled, periodEnd) + 90 * 86_400_000);
}

export type AdminAuditEntry = {
  id: number;
  created_at: string;
  actor: string;
  action: string;
  workshop_id: string | null;
  workshop_name: string | null;
  details: Record<string, unknown>;
};

export async function listAuditLog(limit = 20): Promise<AdminAuditEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_audit_log")
    .select("id, created_at, actor, action, workshop_id, workshop_name, details")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Erro ao carregar o registo: ${error.message}`);
  return (data ?? []) as AdminAuditEntry[];
}
