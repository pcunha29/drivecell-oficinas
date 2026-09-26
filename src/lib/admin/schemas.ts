import { z } from "zod";

/** Estado devolvido pelas server actions dos formulários do admin. */
export type AdminFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const optionalPhone = z
  .string()
  .trim()
  .max(32, { error: "Máximo 32 caracteres." });

const optionalNif = z
  .string()
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => v === "" || /^\d{9}$/.test(v), {
    error: "O NIF tem 9 dígitos.",
  });

const workshopName = z
  .string()
  .trim()
  .min(2, { error: "Indica o nome da oficina (mín. 2 caracteres)." })
  .max(80, { error: "Máximo 80 caracteres." });

const dateInput = /^\d{4}-\d{2}-\d{2}$/;

export const newWorkshopSchema = z.object({
    name: workshopName,
    phone: optionalPhone,
    nif: optionalNif,
    ownerName: z
      .string()
      .trim()
      .min(1, { error: "Indica o nome do dono." })
      .max(120, { error: "Máximo 120 caracteres." }),
    ownerEmail: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: "Email inválido." })),
    initialStatus: z.enum(["trialing", "active"], { error: "Estado inválido." }),
    trialDays: z.coerce
      .number({ error: "Indica o número de dias." })
      .int({ error: "Número inteiro de dias." })
      .min(1, { error: "Mínimo 1 dia." })
      .max(365, { error: "Máximo 365 dias." }),
    isDemo: z.boolean(),
});

export type NewWorkshopInput = z.infer<typeof newWorkshopSchema>;

export const updateWorkshopSchema = z.object({
  id: z.uuid({ error: "Oficina inválida." }),
  name: workshopName,
  phone: optionalPhone,
  nif: optionalNif,
  subscriptionStatus: z.enum(["trialing", "active", "past_due", "canceled"], {
    error: "Estado inválido.",
  }),
  trialEndsAt: z.string().regex(dateInput, { error: "Indica a data de fim do teste." }),
  currentPeriodEnd: z
    .string()
    .refine((v) => v === "" || dateInput.test(v), { error: "Data inválida." }),
  adminNotes: z.string().max(5000, { error: "Máximo 5000 caracteres." }),
  isDemo: z.boolean(),
});

export const demoAccountSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Email inválido." })),
});

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function formBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}
