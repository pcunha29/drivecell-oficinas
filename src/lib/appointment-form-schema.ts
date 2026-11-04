import { z } from "zod";
import { isValidDay, isValidTime } from "@/lib/calendar";

/** Limites iguais aos da base de dados (tabela appointments). */
export const APPOINTMENT_LIMITS = {
  serviceType: 80,
  customerName: 120,
  phone: 30,
  plate: 20,
  notes: 1000,
} as const;

/** Sugestões do campo «Tipo de serviço» (texto livre). */
export const SERVICE_TYPE_SUGGESTIONS = [
  "Revisão",
  "Lavagem completa",
  "Mudança de óleo",
  "Pneus",
  "Travões",
  "Diagnóstico",
  "Inspeção (IPO)",
  "Ar condicionado",
] as const;

const max = (limit: number) => `Máximo ${limit} caracteres.`;

export const appointmentFormSchema = z
  .object({
    serviceType: z.string().trim().min(1, "Indica o tipo de serviço.").max(APPOINTMENT_LIMITS.serviceType, max(APPOINTMENT_LIMITS.serviceType)),
    customerName: z.string().trim().min(1, "Indica o nome do cliente.").max(APPOINTMENT_LIMITS.customerName, max(APPOINTMENT_LIMITS.customerName)),
    /** Cliente/viatura escolhidos da lista ("" = escrito à mão). */
    customerId: z.string().default(""),
    vehicleId: z.string().default(""),
    phone: z.string().trim().max(APPOINTMENT_LIMITS.phone, max(APPOINTMENT_LIMITS.phone)).default(""),
    plate: z
      .string()
      .trim()
      .max(APPOINTMENT_LIMITS.plate, max(APPOINTMENT_LIMITS.plate))
      .transform((v) => v.toUpperCase())
      .default(""),
    day: z.string().refine(isValidDay, "Escolhe a data."),
    /** "HH:MM" ou "" (sem hora). */
    startTime: z.string().default(""),
    /** "HH:MM" ou "" (hora certa). */
    endTime: z.string().default(""),
    status: z.enum(["scheduled", "canceled", "no_show"]).default("scheduled"),
    notes: z.string().trim().max(APPOINTMENT_LIMITS.notes, max(APPOINTMENT_LIMITS.notes)).default(""),
  })
  .superRefine((v, ctx) => {
    if (v.startTime && !isValidTime(v.startTime)) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Hora inválida." });
    }
    if (v.endTime) {
      if (!v.startTime) {
        ctx.addIssue({ code: "custom", path: ["startTime"], message: "Indica a hora de início." });
      } else if (!isValidTime(v.endTime)) {
        ctx.addIssue({ code: "custom", path: ["endTime"], message: "Hora inválida." });
      } else if (v.endTime <= v.startTime) {
        ctx.addIssue({ code: "custom", path: ["endTime"], message: "A hora de fim tem de ser depois da de início." });
      }
    }
  });

export type AppointmentFormValues = z.input<typeof appointmentFormSchema>;
export type AppointmentFormOutput = z.output<typeof appointmentFormSchema>;
