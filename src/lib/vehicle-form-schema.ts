import { z } from "zod";

export const vehicleFormSchema = z.object({
  customerId: z.string().min(1, "Escolhe um cliente"),
  plate: z.string().min(1, "Matrícula obrigatória"),
  make: z.string().min(1, "Marca obrigatória"),
  model: z.string().min(1, "Modelo obrigatório"),
  year: z.coerce.number().min(1900).max(2100),
});

export type VehicleFormValues = z.input<typeof vehicleFormSchema>;
