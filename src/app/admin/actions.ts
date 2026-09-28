"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import {
  findMembershipForUser,
  findUserByEmail,
  hasDemoWorkshop,
} from "@/lib/admin/data";
import { lisbonEndOfDayIso } from "@/lib/admin/format";
import { generatePassword } from "@/lib/admin/password";
import {
  demoAccountSchema,
  formBoolean,
  formString,
  newWorkshopSchema,
  updateWorkshopSchema,
  type AdminFormState,
} from "@/lib/admin/schemas";
import { buildConfirmLink, getInviteRedirectUrl } from "@/lib/admin/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminEvent } from "@/lib/admin/audit";
import { customerKey, IMPORT_MAX_ROWS } from "@/lib/import/customers-csv";
import { isAdminEmail } from "@/lib/admin/emails";

// Todas as actions começam por requireAdmin(): o layout de /admin não protege
// chamadas diretas às server actions.

type WorkshopRpcRow = { id: string };

function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return (data as T) ?? null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado.";
}

function validationError(error: z.ZodError): AdminFormState {
  return {
    status: "error",
    message: "Corrige os campos assinalados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  };
}

const uuidSchema = z.uuid();

// ---------------------------------------------------------------------------
// Nova oficina: convida o dono por email e cria a oficina.
// ---------------------------------------------------------------------------

export async function createWorkshopAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireAdmin();

  const parsed = newWorkshopSchema.safeParse({
    name: formString(formData, "name"),
    phone: formString(formData, "phone"),
    nif: formString(formData, "nif"),
    ownerName: formString(formData, "ownerName"),
    ownerEmail: formString(formData, "ownerEmail"),
    initialStatus: formString(formData, "initialStatus"),
    trialDays: formString(formData, "trialDays") || "14",
    isDemo: formBoolean(formData, "isDemo"),
  });
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const admin = createAdminClient();
  let workshopId: string;
  let invited = false;

  try {
    let user = await findUserByEmail(admin, input.ownerEmail);

    if (!user) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(input.ownerEmail, {
        data: { full_name: input.ownerName },
        redirectTo: getInviteRedirectUrl(),
      });
      if (error?.code === "email_exists") {
        // Criado entretanto (corrida): usa o existente sem reenviar.
        user = await findUserByEmail(admin, input.ownerEmail);
      } else if (error || !data.user) {
        return {
          status: "error",
          message: `Não foi possível enviar o convite: ${error?.message ?? "sem resposta do Supabase."}`,
        };
      } else {
        user = data.user;
        invited = true;
      }
      if (!user) {
        return { status: "error", message: "Não foi possível obter o utilizador do dono." };
      }
    }

    const membership = await findMembershipForUser(admin, user.id);
    if (membership) {
      return {
        status: "error",
        message: `${input.ownerEmail} já pertence à oficina «${membership.workshopName}». Cada utilizador só pode ter uma oficina.`,
        fieldErrors: { ownerEmail: ["Este utilizador já tem oficina."] },
      };
    }

    const { data, error } = await admin.rpc("admin_create_workshop", {
      p_owner_id: user.id,
      p_name: input.name,
      p_phone: input.phone || null,
      p_nif: input.nif || null,
      p_status: input.initialStatus,
      p_trial_days: input.initialStatus === "trialing" ? input.trialDays : 0,
      p_is_demo: input.isDemo,
    });
    const row = firstRow<WorkshopRpcRow>(data);
    if (error || !row) {
      return {
        status: "error",
        message: `${invited ? "O convite foi enviado, mas a oficina não foi criada" : "A oficina não foi criada"}: ${error?.message ?? "sem resposta."} Tenta de novo (o convite não será reenviado).`,
      };
    }
    workshopId = row.id;
    await logAdminEvent(admin, {
      actor: actor.email ?? "admin",
      action: "workshop.create",
      workshopId,
      workshopName: input.name,
      details: { owner: input.ownerEmail, status: input.initialStatus, demo: input.isDemo, invited },
    });
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }

  revalidatePath("/admin");
  redirect(`/admin/${workshopId}?criada=${invited ? "convite" : "existente"}`);
}

// ---------------------------------------------------------------------------
// Editar oficina (dados, subscrição, notas internas).
// ---------------------------------------------------------------------------

export async function updateWorkshopAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const actor = await requireAdmin();

  const parsed = updateWorkshopSchema.safeParse({
    id: formString(formData, "id"),
    name: formString(formData, "name"),
    phone: formString(formData, "phone"),
    nif: formString(formData, "nif"),
    subscriptionStatus: formString(formData, "subscriptionStatus"),
    trialEndsAt: formString(formData, "trialEndsAt"),
    currentPeriodEnd: formString(formData, "currentPeriodEnd"),
    adminNotes: formString(formData, "adminNotes"),
    isDemo: formBoolean(formData, "isDemo"),
  });
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("workshops")
      .update({
        name: input.name,
        phone: input.phone || null,
        nif: input.nif || null,
        subscription_status: input.subscriptionStatus,
        trial_ends_at: lisbonEndOfDayIso(input.trialEndsAt),
        current_period_end: input.currentPeriodEnd
          ? lisbonEndOfDayIso(input.currentPeriodEnd)
          : null,
        admin_notes: input.adminNotes,
        is_demo: input.isDemo,
      })
      .eq("id", input.id)
      .select("id");
    if (error) return { status: "error", message: `Não foi possível guardar: ${error.message}` };
    if (!data || data.length === 0) return { status: "error", message: "Oficina não encontrada." };
    await logAdminEvent(admin, {
      actor: actor.email ?? "admin",
      action: "workshop.update",
      workshopId: input.id,
      workshopName: input.name,
      details: {
        status: input.subscriptionStatus,
        trial_ends_at: input.trialEndsAt || null,
        current_period_end: input.currentPeriodEnd || null,
      },
    });
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/${input.id}`);
  return { status: "success", message: "Alterações guardadas." };
}

// ---------------------------------------------------------------------------
// Reenviar convite a um membro que nunca entrou.
// ---------------------------------------------------------------------------

export type ResendInviteResult = {
  status: "success" | "error";
  message: string;
  /** Link manual (quando o Supabase não reenvia o email). Só para o admin copiar. */
  link?: string;
};

export async function resendInviteAction(
  workshopId: string,
  userId: string,
): Promise<ResendInviteResult> {
  await requireAdmin();

  if (!uuidSchema.safeParse(workshopId).success || !uuidSchema.safeParse(userId).success) {
    return { status: "error", message: "Pedido inválido." };
  }

  try {
    const admin = createAdminClient();
    const { data: member, error: memberError } = await admin
      .from("workshop_members")
      .select("user_id")
      .eq("workshop_id", workshopId)
      .eq("user_id", userId)
      .maybeSingle();
    if (memberError) return { status: "error", message: memberError.message };
    if (!member) return { status: "error", message: "Este utilizador não é membro desta oficina." };

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    const user = userData?.user;
    if (userError || !user?.email) {
      return { status: "error", message: "Utilizador não encontrado no Supabase Auth." };
    }
    if (user.last_sign_in_at) {
      return { status: "error", message: "Este utilizador já entrou na app; não precisa de convite." };
    }

    // 1) Email ainda por confirmar: o Supabase reenvia o convite (mesmo template "Invite user").
    if (!user.email_confirmed_at) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const { error } = await admin.auth.admin.inviteUserByEmail(user.email, {
        data: typeof meta.full_name === "string" ? { full_name: meta.full_name } : undefined,
        redirectTo: getInviteRedirectUrl(),
      });
      if (!error) {
        revalidatePath(`/admin/${workshopId}`);
        return { status: "success", message: `Convite reenviado para ${user.email}.` };
      }
      if (error.code !== "email_exists") {
        return { status: "error", message: `Não foi possível reenviar o convite: ${error.message}` };
      }
    }

    // 2) Email já confirmado (ex.: conta criada com email_confirm): o Supabase recusa
    //    novos convites, por isso gera-se um link de recuperação para enviar à mão.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: user.email,
      options: { redirectTo: getInviteRedirectUrl() },
    });
    if (linkError || !linkData.properties?.hashed_token) {
      return {
        status: "error",
        message: `Não foi possível gerar o link: ${linkError?.message ?? "sem resposta."}`,
      };
    }
    return {
      status: "success",
      message: `O email de ${user.email} já está confirmado, por isso o Supabase não reenvia convites. Envia este link ao cliente (uso único, expira conforme a validade dos links no Supabase):`,
      link: buildConfirmLink(
        linkData.properties.hashed_token,
        linkData.properties.verification_type || "recovery",
      ),
    };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Repor dados de demonstração (só oficinas is_demo).
// ---------------------------------------------------------------------------

export async function resetDemoDataAction(
  workshopId: string,
): Promise<{ status: "success" | "error"; message: string }> {
  const actor = await requireAdmin();

  if (!uuidSchema.safeParse(workshopId).success) {
    return { status: "error", message: "Oficina inválida." };
  }

  try {
    const admin = createAdminClient();
    const { data: workshop, error: fetchError } = await admin
      .from("workshops")
      .select("id, is_demo")
      .eq("id", workshopId)
      .maybeSingle();
    if (fetchError) return { status: "error", message: fetchError.message };
    if (!workshop) return { status: "error", message: "Oficina não encontrada." };
    if (!workshop.is_demo) {
      return { status: "error", message: "Só é possível repor dados numa oficina de demonstração." };
    }

    const { error } = await admin.rpc("seed_demo_data", { p_workshop_id: workshopId });
    if (error) return { status: "error", message: `Não foi possível repor os dados: ${error.message}` };
    await logAdminEvent(admin, {
      actor: actor.email ?? "admin",
      action: "workshop.reset_demo",
      workshopId,
    });
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/${workshopId}`);
  return { status: "success", message: "Dados de demonstração repostos." };
}

// ---------------------------------------------------------------------------
// Conta demo: utilizador com palavra-passe + oficina is_demo com dados de exemplo.
// ---------------------------------------------------------------------------

export type DemoAccountState = AdminFormState & {
  /** Mostradas UMA vez ao admin; não ficam guardadas em lado nenhum. */
  credentials?: { email: string; password: string; workshopId: string };
};

export async function createDemoAccountAction(
  _prev: DemoAccountState,
  formData: FormData,
): Promise<DemoAccountState> {
  await requireAdmin();

  const parsed = demoAccountSchema.safeParse({
    email: formString(formData, "email") || "demo@drivecell.pt",
  });
  if (!parsed.success) return validationError(parsed.error);
  const { email } = parsed.data;

  const admin = createAdminClient();
  try {
    if (await hasDemoWorkshop(admin)) {
      return { status: "error", message: "Já existe uma oficina de demonstração." };
    }
    if (await findUserByEmail(admin, email)) {
      return {
        status: "error",
        message: `Já existe um utilizador ${email}. Usa outro email ou cria a oficina em «Nova oficina» com «Oficina de demonstração» assinalado.`,
        fieldErrors: { email: ["Email já registado."] },
      };
    }

    const password = generatePassword(16);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Demonstração" },
    });
    if (createError || !created.user) {
      return {
        status: "error",
        message: `Não foi possível criar o utilizador: ${createError?.message ?? "sem resposta."}`,
      };
    }

    const { data, error } = await admin.rpc("admin_create_workshop", {
      p_owner_id: created.user.id,
      p_name: "Oficina Ferreira & Filhos",
      p_phone: null,
      p_nif: null,
      p_status: "active",
      p_trial_days: 0,
      p_is_demo: true,
    });
    const row = firstRow<WorkshopRpcRow>(data);
    if (error || !row) {
      // Desfaz o utilizador para se poder tentar de novo com o mesmo email.
      await admin.auth.admin.deleteUser(created.user.id);
      return {
        status: "error",
        message: `Não foi possível criar a oficina de demonstração: ${error?.message ?? "sem resposta."}`,
      };
    }

    revalidatePath("/admin");
    return {
      status: "success",
      message: "Conta de demonstração criada.",
      credentials: { email, password, workshopId: row.id },
    };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Site público: modo "em construção" e lista de interessados.
// ---------------------------------------------------------------------------

export type SimpleActionResult = { status: "success" | "error"; message: string };

export async function setUnderConstructionAction(on: boolean): Promise<SimpleActionResult> {
  await requireAdmin();
  if (typeof on !== "boolean") return { status: "error", message: "Pedido inválido." };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("site_settings")
      .upsert({ id: 1, under_construction: on, updated_at: new Date().toISOString() });
    if (error) return { status: "error", message: `Não foi possível guardar: ${error.message}` };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }

  revalidatePath("/admin/site");
  return {
    status: "success",
    message: on
      ? "Modo em construção ligado: o público vê a página de espera."
      : "Modo em construção desligado: o site está aberto a todos.",
  };
}

export async function deleteInteressadoAction(id: string): Promise<SimpleActionResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { status: "error", message: "Pedido inválido." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("interessados").delete().eq("id", id);
    if (error) return { status: "error", message: `Não foi possível apagar: ${error.message}` };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }

  revalidatePath("/admin/site");
  return { status: "success", message: "Email apagado da lista." };
}

export async function setInteressadoContactedAction(
  id: string,
  contacted: boolean,
): Promise<SimpleActionResult> {
  await requireAdmin();
  if (!uuidSchema.safeParse(id).success) return { status: "error", message: "Pedido inválido." };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("interessados")
      .update({ contacted_at: contacted ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return { status: "error", message: `Não foi possível guardar: ${error.message}` };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }

  revalidatePath("/admin/site");
  return { status: "success", message: contacted ? "Marcado como contactado." : "Marcado como por contactar." };
}

// ---------------------------------------------------------------------------
// Eliminar oficina a pedido (RGPD): apaga a oficina e, opcionalmente, as contas
// de acesso que não pertençam a outra oficina. Fica registado no admin_audit_log.
// ---------------------------------------------------------------------------

export async function deleteWorkshopAction(
  workshopId: string,
  confirmName: string,
  deleteUsers: boolean,
): Promise<SimpleActionResult> {
  const actor = await requireAdmin();
  if (!uuidSchema.safeParse(workshopId).success) return { status: "error", message: "Pedido inválido." };

  const admin = createAdminClient();
  try {
    const { data: workshop, error: fetchError } = await admin
      .from("workshops")
      .select("id, name, subscription_status, is_demo, workshop_members(user_id)")
      .eq("id", workshopId)
      .maybeSingle();
    if (fetchError) return { status: "error", message: fetchError.message };
    if (!workshop) return { status: "error", message: "Oficina não encontrada." };

    if (confirmName.trim() !== String(workshop.name).trim()) {
      return { status: "error", message: "O nome escrito não corresponde ao da oficina." };
    }

    const memberIds = ((workshop.workshop_members ?? []) as { user_id: string }[]).map((m) => m.user_id);

    const { error: deleteError } = await admin.from("workshops").delete().eq("id", workshopId);
    if (deleteError) return { status: "error", message: `Não foi possível eliminar: ${deleteError.message}` };

    const deletedUsers: string[] = [];
    const keptUsers: string[] = [];
    if (deleteUsers) {
      for (const userId of memberIds) {
        const { data: remaining } = await admin
          .from("workshop_members")
          .select("workshop_id")
          .eq("user_id", userId)
          .limit(1);
        const { data: userData } = await admin.auth.admin.getUserById(userId);
        const email = userData?.user?.email ?? userId;
        if ((remaining ?? []).length > 0 || isAdminEmail(userData?.user?.email)) {
          keptUsers.push(email);
          continue;
        }
        // Foto de perfil (avatars/<id>/…) antes de apagar a conta.
        const { data: files } = await admin.storage.from("avatars").list(userId);
        if (files && files.length > 0) {
          await admin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
        }
        const { error: userError } = await admin.auth.admin.deleteUser(userId);
        if (userError) keptUsers.push(`${email} (erro: ${userError.message})`);
        else deletedUsers.push(email);
      }
    }

    await logAdminEvent(admin, {
      actor: actor.email ?? "admin",
      action: "workshop.delete",
      workshopId,
      workshopName: workshop.name,
      details: {
        status: workshop.subscription_status,
        demo: workshop.is_demo,
        deleted_users: deletedUsers,
        kept_users: keptUsers,
      },
    });

    revalidatePath("/admin");
    const usersNote = deleteUsers
      ? ` Contas apagadas: ${deletedUsers.length}${keptUsers.length ? `; mantidas: ${keptUsers.length}` : ""}.`
      : "";
    return { status: "success", message: `Oficina «${workshop.name}» eliminada.${usersNote}` };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Importar clientes e viaturas (CSV já lido e validado no browser; volta a
// validar aqui). Reaproveita clientes com o mesmo nome e telefone e ignora
// matrículas que a oficina já tem.
// ---------------------------------------------------------------------------

const importRowSchema = z.object({
  line: z.number().int(),
  nome: z.string().trim().min(1).max(120),
  telefone: z.string().max(40),
  email: z.string().max(200),
  notas: z.string().max(2000),
  matricula: z.string().max(20),
  marca: z.string().max(60),
  modelo: z.string().max(60),
  ano: z.number().int().min(1900).max(2100).nullable(),
});

const CHUNK = 500;

export async function importCustomersAction(
  workshopId: string,
  rawRows: unknown,
): Promise<SimpleActionResult> {
  const actor = await requireAdmin();
  if (!uuidSchema.safeParse(workshopId).success) return { status: "error", message: "Pedido inválido." };

  const parsed = z.array(importRowSchema).max(IMPORT_MAX_ROWS).safeParse(rawRows);
  if (!parsed.success) return { status: "error", message: "Dados do ficheiro inválidos. Volta a escolher o ficheiro." };
  const rows = parsed.data;
  if (rows.length === 0) return { status: "error", message: "Não há linhas para importar." };

  const admin = createAdminClient();
  try {
    const { data: workshop, error: wsError } = await admin
      .from("workshops")
      .select("id, name")
      .eq("id", workshopId)
      .maybeSingle();
    if (wsError) return { status: "error", message: wsError.message };
    if (!workshop) return { status: "error", message: "Oficina não encontrada." };

    const [{ data: existingCustomers, error: cErr }, { data: existingVehicles, error: vErr }] = await Promise.all([
      admin.from("customers").select("id, name, phone").eq("workshop_id", workshopId),
      admin.from("vehicles").select("plate").eq("workshop_id", workshopId),
    ]);
    if (cErr) return { status: "error", message: cErr.message };
    if (vErr) return { status: "error", message: vErr.message };

    const customerIdByKey = new Map<string, string>();
    for (const c of existingCustomers ?? []) customerIdByKey.set(customerKey(c.name, c.phone ?? ""), c.id);
    const reusedKeys = new Set<string>();

    // 1) Clientes novos (dados da primeira linha de cada cliente, completados pelas seguintes).
    const newCustomers = new Map<string, { name: string; phone: string; email: string; notes: string }>();
    for (const r of rows) {
      const key = customerKey(r.nome, r.telefone);
      if (customerIdByKey.has(key)) {
        reusedKeys.add(key);
        continue;
      }
      const current = newCustomers.get(key);
      if (!current) {
        newCustomers.set(key, { name: r.nome, phone: r.telefone, email: r.email, notes: r.notas });
      } else {
        current.email ||= r.email;
        current.notes ||= r.notas;
      }
    }

    const toInsert = [...newCustomers.entries()];
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const { data, error } = await admin
        .from("customers")
        .insert(chunk.map(([, c]) => ({ workshop_id: workshopId, slug: "", ...c })))
        .select("id, name, phone");
      if (error) return { status: "error", message: `Erro ao criar clientes: ${error.message}` };
      for (const c of data ?? []) customerIdByKey.set(customerKey(c.name, c.phone ?? ""), c.id);
    }

    // 2) Viaturas: ignora matrículas repetidas no ficheiro ou já existentes na oficina.
    const knownPlates = new Set((existingVehicles ?? []).map((v) => String(v.plate).toUpperCase()));
    let skippedPlates = 0;
    const vehicles: Record<string, unknown>[] = [];
    for (const r of rows) {
      if (!r.matricula) continue;
      const plate = r.matricula.toUpperCase();
      if (knownPlates.has(plate)) {
        skippedPlates += 1;
        continue;
      }
      const customerId = customerIdByKey.get(customerKey(r.nome, r.telefone));
      if (!customerId) continue;
      knownPlates.add(plate);
      vehicles.push({
        workshop_id: workshopId,
        customer_id: customerId,
        plate,
        make: r.marca,
        model: r.modelo,
        year: r.ano,
      });
    }
    for (let i = 0; i < vehicles.length; i += CHUNK) {
      const { error } = await admin.from("vehicles").insert(vehicles.slice(i, i + CHUNK));
      if (error) {
        return {
          status: "error",
          message: `Clientes criados (${toInsert.length}), mas houve um erro nas viaturas: ${error.message}`,
        };
      }
    }

    await logAdminEvent(admin, {
      actor: actor.email ?? "admin",
      action: "workshop.import",
      workshopId,
      workshopName: workshop.name,
      details: {
        rows: rows.length,
        customers_created: toInsert.length,
        customers_reused: reusedKeys.size,
        vehicles_created: vehicles.length,
        plates_skipped: skippedPlates,
      },
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/${workshopId}`);
    const parts = [
      `${toInsert.length} clientes criados`,
      reusedKeys.size ? `${reusedKeys.size} já existiam` : null,
      `${vehicles.length} viaturas criadas`,
      skippedPlates ? `${skippedPlates} matrículas já existiam e foram ignoradas` : null,
    ].filter(Boolean);
    return { status: "success", message: `Importação concluída: ${parts.join(", ")}.` };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

// ---------------------------------------------------------------------------
// Membros: adicionar (mecânico ou outro dono) e remover.
// O convite é um link gerado aqui (não depende do template de email do Supabase):
// o admin envia-o por WhatsApp/email; o link abre /auth/confirm → definir palavra-passe.
// ---------------------------------------------------------------------------

export type AddMemberState = AdminFormState & {
  /** Link de convite para enviar à mão (quando é uma conta nova). */
  link?: string;
  email?: string;
};

const addMemberSchema = z.object({
  workshopId: z.uuid(),
  fullName: z.string().trim().max(120),
  email: z.email("Email inválido.").trim().toLowerCase(),
  role: z.enum(["member", "owner"]),
});

export async function addMemberAction(
  _prev: AddMemberState,
  formData: FormData,
): Promise<AddMemberState> {
  const actor = await requireAdmin();

  const parsed = addMemberSchema.safeParse({
    workshopId: formString(formData, "workshopId"),
    fullName: formString(formData, "fullName"),
    email: formString(formData, "email"),
    role: formString(formData, "role") || "member",
  });
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  const admin = createAdminClient();
  try {
    const { data: workshop, error: wsError } = await admin
      .from("workshops")
      .select("id, name")
      .eq("id", input.workshopId)
      .maybeSingle();
    if (wsError) return { status: "error", message: wsError.message };
    if (!workshop) return { status: "error", message: "Oficina não encontrada." };

    let user = await findUserByEmail(admin, input.email);
    let link: string | undefined;

    if (user) {
      const membership = await findMembershipForUser(admin, user.id);
      if (membership) {
        return {
          status: "error",
          message:
            membership.workshopId === input.workshopId
              ? `${input.email} já é membro desta oficina.`
              : `${input.email} já pertence à oficina «${membership.workshopName}». Cada utilizador só pode ter uma oficina.`,
          fieldErrors: { email: ["Este utilizador já tem oficina."] },
        };
      }
    } else {
      const { data, error } = await admin.auth.admin.generateLink({
        type: "invite",
        email: input.email,
        options: {
          redirectTo: getInviteRedirectUrl(),
          data: input.fullName ? { full_name: input.fullName } : undefined,
        },
      });
      if (error || !data.user || !data.properties?.hashed_token) {
        return { status: "error", message: `Não foi possível criar o convite: ${error?.message ?? "sem resposta."}` };
      }
      user = data.user;
      link = buildConfirmLink(data.properties.hashed_token, data.properties.verification_type || "invite");
    }

    const { error: memberError } = await admin
      .from("workshop_members")
      .insert({ workshop_id: input.workshopId, user_id: user.id, role: input.role });
    if (memberError) return { status: "error", message: `Não foi possível adicionar: ${memberError.message}` };

    await logAdminEvent(admin, {
      actor: actor.email ?? "admin",
      action: "workshop.member_add",
      workshopId: input.workshopId,
      workshopName: workshop.name,
      details: { email: input.email, role: input.role, new_account: Boolean(link) },
    });

    revalidatePath(`/admin/${input.workshopId}`);
    return {
      status: "success",
      message: link
        ? `${input.email} adicionado. Envia-lhe este link para definir a palavra-passe (uso único):`
        : `${input.email} já tinha conta e foi adicionado. Pode entrar com a palavra-passe que já tem.`,
      link,
      email: input.email,
    };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function removeMemberAction(
  workshopId: string,
  userId: string,
): Promise<SimpleActionResult> {
  const actor = await requireAdmin();
  if (!uuidSchema.safeParse(workshopId).success || !uuidSchema.safeParse(userId).success) {
    return { status: "error", message: "Pedido inválido." };
  }

  const admin = createAdminClient();
  try {
    const { data: members, error } = await admin
      .from("workshop_members")
      .select("user_id, role, workshops(name)")
      .eq("workshop_id", workshopId);
    if (error) return { status: "error", message: error.message };
    const member = (members ?? []).find((m) => m.user_id === userId);
    if (!member) return { status: "error", message: "Este utilizador não é membro desta oficina." };
    const owners = (members ?? []).filter((m) => m.role === "owner");
    if (member.role === "owner" && owners.length <= 1) {
      return { status: "error", message: "É o único dono: adiciona outro dono antes de o remover." };
    }

    const { error: deleteError } = await admin
      .from("workshop_members")
      .delete()
      .eq("workshop_id", workshopId)
      .eq("user_id", userId);
    if (deleteError) return { status: "error", message: deleteError.message };

    // Conta sem nenhuma oficina (e que não é de admin): apaga-a, com a foto de perfil.
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const email = userData?.user?.email ?? userId;
    const remaining = await findMembershipForUser(admin, userId);
    let accountDeleted = false;
    if (!remaining && !isAdminEmail(userData?.user?.email)) {
      const { data: files } = await admin.storage.from("avatars").list(userId);
      if (files && files.length > 0) {
        await admin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
      }
      const { error: userError } = await admin.auth.admin.deleteUser(userId);
      accountDeleted = !userError;
    }

    const embed = member.workshops as unknown as { name: string } | { name: string }[] | null;
    await logAdminEvent(admin, {
      actor: actor.email ?? "admin",
      action: "workshop.member_remove",
      workshopId,
      workshopName: Array.isArray(embed) ? embed[0]?.name : embed?.name,
      details: { email, role: member.role, account_deleted: accountDeleted },
    });

    revalidatePath(`/admin/${workshopId}`);
    return {
      status: "success",
      message: accountDeleted ? `${email} removido e conta apagada.` : `${email} removido da oficina.`,
    };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}
