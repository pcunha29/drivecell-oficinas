import { z } from "zod";

export const serviceItemSchema = z.object({
  description: z.string(),
  quantity: z.coerce.number().min(0.01, "A quantidade tem de ser maior que 0"),
  unitPrice: z.coerce.number().min(0, "O preço não pode ser negativo"),
});

export const orderFormSchema = z.object({
  vehicleId: z.string().min(1, "Escolhe uma viatura"),
  customerId: z.string().min(1, "Escolhe um cliente"),
  status: z.enum(["waiting", "in_progress", "done", "delivered"]),
  description: z.string().min(1, "Descrição obrigatória"),
  notes: z.string().optional().default(""),
  paid: z.boolean().default(false),
  items: z.array(serviceItemSchema).default([]),
});

export type OrderFormValues = z.input<typeof orderFormSchema>;
