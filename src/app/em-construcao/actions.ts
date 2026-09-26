"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type InterestState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; email: string };

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Guarda o email na lista de interessados.
 * - Campo "empresa" escondido: se vier preenchido é um robô; responde "sucesso" sem guardar.
 * - Email repetido: responde "sucesso" na mesma (não revela quem já está na lista).
 */
export async function registerInterestAction(
  _prev: InterestState,
  formData: FormData,
): Promise<InterestState> {
  if (field(formData, "empresa")) return { status: "success" };

  const raw = field(formData, "email").slice(0, 254);
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Esse email não parece certo. Confirma e tenta outra vez.", email: raw };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("interessados")
      .upsert({ email: parsed.data, source: "em-construcao" }, { onConflict: "email", ignoreDuplicates: true });
    if (error) throw error;
  } catch (error) {
    console.error("[interessados] falha ao guardar", error);
    return {
      status: "error",
      message: "Não conseguimos guardar o email agora. Tenta daqui a pouco.",
      email: parsed.data,
    };
  }

  return { status: "success" };
}
