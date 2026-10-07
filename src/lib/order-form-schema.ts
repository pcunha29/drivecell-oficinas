import { z } from "zod";

export const serviceItemSchema = z.object({
  description: z.string(),
  quantity: z.coerce.number().min(0.01, "A quantidade tem de ser maior que 0"),
  unitPrice: z.coerce.number().min(0, "O preço não pode ser negativo"),
  /** Custo unitário opcional: vazio = não registado. */
  unitCost: z.preprocess(
    (v) =>
      v === "" || v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))
        ? null
        : v,
    z.coerce.number().min(0, "O custo não pode ser negativo").nullable(),
  ).optional(),
});

export const orderFormSchema = z
  .object({
    vehicleId: z.string().min(1, "Escolhe uma viatura"),
    customerId: z.string().min(1, "Escolhe um cliente"),
    status: z.enum(["waiting", "in_progress", "done", "delivered"]),
    description: z.string().min(1, "Descrição obrigatória"),
    notes: z.string().optional().default(""),
    paid: z.boolean().default(false),
    items: z.array(serviceItemSchema).default([]),
    /** Entrada e saída da viatura, como "AAAA-MM-DDTHH:mm" (hora local) ou "" (automático). */
    checkedInAt: z.string().optional().default(""),
    checkedOutAt: z.string().optional().default(""),
  })
  .refine(
    (v) =>
      v.status !== "delivered" ||
      !v.checkedInAt ||
      !v.checkedOutAt ||
      v.checkedOutAt >= v.checkedInAt,
    { path: ["checkedOutAt"], message: "A saída não pode ser antes da entrada." },
  );

export type OrderFormValues = z.input<typeof orderFormSchema>;
