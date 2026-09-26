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
  await requireAdmin();

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
  await requireAdmin();

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
  await requireAdmin();

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
