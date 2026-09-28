import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "workshop.create"
  | "workshop.update"
  | "workshop.delete"
  | "workshop.reset_demo"
  | "workshop.purge";

/** Texto das ações no painel. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "workshop.create": "Oficina criada",
  "workshop.update": "Oficina alterada",
  "workshop.delete": "Oficina eliminada",
  "workshop.reset_demo": "Demonstração reposta",
  "workshop.purge": "Eliminada (retenção de 90 dias)",
};

/**
 * Regista uma ação no admin_audit_log. Nunca faz falhar a ação principal:
 * se o registo falhar, fica só no log do servidor.
 */
export async function logAdminEvent(
  admin: SupabaseClient,
  event: {
    actor: string;
    action: AuditAction;
    workshopId?: string | null;
    workshopName?: string | null;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { error } = await admin.from("admin_audit_log").insert({
      actor: event.actor,
      action: event.action,
      workshop_id: event.workshopId ?? null,
      workshop_name: event.workshopName ?? null,
      details: event.details ?? {},
    });
    if (error) console.error("[admin_audit_log]", error.message);
  } catch (error) {
    console.error("[admin_audit_log]", error);
  }
}
