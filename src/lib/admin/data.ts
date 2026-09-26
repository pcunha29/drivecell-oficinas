import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

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
  admin_notes: string;
  created_at: string;
};

export type AdminWorkshopListItem = AdminWorkshop & {
  ownerEmails: string[];
  customerCount: number;
  orderCount: number;
};

export type AdminMember = {
  userId: string;
  role: string;
  email: string | null;
  fullName: string | null;
  invitedAt: string | null;
  confirmedAt: string | null;
  lastSignInAt: string | null;
};

export type AdminWorkshopDetail = AdminWorkshop & {
  customerCount: number;
  orderCount: number;
  members: AdminMember[];
};

const WORKSHOP_COLUMNS =
  "id, name, phone, nif, subscription_status, trial_ends_at, current_period_end, is_demo, admin_notes, created_at";

type CountEmbed = { count: number }[] | null | undefined;
type MemberEmbed = { user_id: string; role: string }[] | null | undefined;

type WorkshopWithEmbeds = AdminWorkshop & {
  customers?: CountEmbed;
  service_orders?: CountEmbed;
  workshop_members?: MemberEmbed;
};

function embeddedCount(value: CountEmbed): number {
  return value?.[0]?.count ?? 0;
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

export async function listWorkshops(): Promise<AdminWorkshopListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workshops")
    .select(
      `${WORKSHOP_COLUMNS}, customers(count), service_orders(count), workshop_members(user_id, role)`,
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Erro ao carregar oficinas: ${error.message}`);

  const rows = (data ?? []) as unknown as WorkshopWithEmbeds[];
  const emailById = new Map<string, string>();
  if (rows.length > 0) {
    for (const user of await listAllUsers(admin)) {
      if (user.email) emailById.set(user.id, user.email);
    }
  }

  return rows.map(({ customers, service_orders, workshop_members, ...workshop }) => ({
    ...workshop,
    customerCount: embeddedCount(customers),
    orderCount: embeddedCount(service_orders),
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
  const { data, error } = await admin
    .from("workshops")
    .select(
      `${WORKSHOP_COLUMNS}, customers(count), service_orders(count), workshop_members(user_id, role)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar a oficina: ${error.message}`);
  if (!data) return null;

  const { customers, service_orders, workshop_members, ...workshop } =
    data as unknown as WorkshopWithEmbeds;

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
      };
    }),
  );
  members.sort((a, b) => (a.role === b.role ? 0 : a.role === "owner" ? -1 : 1));

  return {
    ...workshop,
    customerCount: embeddedCount(customers),
    orderCount: embeddedCount(service_orders),
    members,
  };
}
