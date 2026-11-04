"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrderFormValues } from "@/lib/order-form-schema";

type ExpectedArrivalFieldsProps = {
  register: UseFormRegister<OrderFormValues>;
  errors: FieldErrors<OrderFormValues>;
  /** O carro já entrou (a data prevista fica só como registo). */
  arrived: boolean;
};

/** «Chegada prevista» da ordem (dia + hora opcional). Só aparece com as Marcações ligadas. */
export function ExpectedArrivalFields({ register, errors, arrived }: ExpectedArrivalFieldsProps) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium leading-none">Chegada prevista</legend>
      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 sm:max-w-sm">
        <div className="grid gap-1">
          <Label htmlFor="expectedOn" className="sr-only">
            Dia previsto
          </Label>
          <Input
            id="expectedOn"
            type="date"
            aria-invalid={errors.expectedOn ? true : undefined}
            aria-describedby="expectedOn-hint"
            {...register("expectedOn")}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="expectedTime" className="sr-only">
            Hora prevista (opcional)
          </Label>
          <Input id="expectedTime" type="time" step={300} aria-describedby="expectedOn-hint" {...register("expectedTime")} />
        </div>
      </div>
      {errors.expectedOn ? (
        <p id="expectedOn-hint" className="text-sm text-red-600 dark:text-red-400">
          {errors.expectedOn.message}
        </p>
      ) : (
        <p id="expectedOn-hint" className="text-xs text-muted-foreground">
          {arrived ? "O carro já entrou." : "Aparece nas Marcações. A hora é opcional."}
        </p>
      )}
    </fieldset>
  );
}
