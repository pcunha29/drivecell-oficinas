import { z } from "zod";

export const customerFormSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().min(1, "Telefone obrigatório"),
  email: z.string().email("Email inválido").or(z.literal("")).default(""),
  notes: z.string().default(""),
});

export type CustomerFormValues = z.input<typeof customerFormSchema>;
