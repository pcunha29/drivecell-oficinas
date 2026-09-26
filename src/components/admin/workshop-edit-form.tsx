"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { updateWorkshopAction } from "@/app/admin/actions";
import { FieldError, FormMessage } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUSES } from "@/lib/admin/format";
import type { AdminFormState } from "@/lib/admin/schemas";

const initialState: AdminFormState = { status: "idle" };

export type WorkshopEditValues = {
  id: string;
  name: string;
  phone: string;
  nif: string;
  subscriptionStatus: string;
  /** YYYY-MM-DD (Lisboa) */
  trialEndsAt: string;
  /** YYYY-MM-DD (Lisboa) ou "" */
  currentPeriodEnd: string;
  adminNotes: string;
  isDemo: boolean;
};

export function WorkshopEditForm({ values }: { values: WorkshopEditValues }) {
  const [state, formAction, isPending] = useActionState(updateWorkshopAction, initialState);
  const [, startTransition] = useTransition();
  const [isDemo, setIsDemo] = useState(values.isDemo);
  const errors = state.fieldErrors ?? {};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <input type="hidden" name="id" value={values.id} />
      <input type="hidden" name="isDemo" value={isDemo ? "true" : "false"} />

      <Card>
        <CardHeader>
          <CardTitle>Dados da oficina</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={values.name} maxLength={80} />
            <FieldError errors={errors.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={values.phone} maxLength={32} />
            <FieldError errors={errors.phone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nif">NIF</Label>
            <Input id="nif" name="nif" inputMode="numeric" defaultValue={values.nif} maxLength={11} />
            <FieldError errors={errors.nif} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscrição</CardTitle>
          <p className="text-sm text-muted-foreground">
            A app permite escrever com estado «Ativa», «Pagamento em atraso» ou «Em teste» dentro
            do prazo. Teste expirado ou «Cancelada» = só-leitura. «Pago até» é apenas informativo.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="subscriptionStatus">Estado</Label>
            <Select
              id="subscriptionStatus"
              name="subscriptionStatus"
              defaultValue={values.subscriptionStatus}
            >
              {SUBSCRIPTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SUBSCRIPTION_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
            <FieldError errors={errors.subscriptionStatus} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trialEndsAt">Fim do teste</Label>
            <Input
              id="trialEndsAt"
              name="trialEndsAt"
              type="date"
              defaultValue={values.trialEndsAt}
              required
            />
            <FieldError errors={errors.trialEndsAt} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentPeriodEnd">Pago até</Label>
            <Input
              id="currentPeriodEnd"
              name="currentPeriodEnd"
              type="date"
              defaultValue={values.currentPeriodEnd}
            />
            <FieldError errors={errors.currentPeriodEnd} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adminNotes">Notas internas</Label>
            <textarea
              id="adminNotes"
              name="adminNotes"
              defaultValue={values.adminNotes}
              rows={4}
              maxLength={5000}
              className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Só visível aqui no admin (pagamentos, contactos, combinações…)"
            />
            <FieldError errors={errors.adminNotes} />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="isDemo"
              checked={isDemo}
              onCheckedChange={setIsDemo}
              aria-labelledby="isDemo-label"
            />
            <span id="isDemo-label" className="text-sm">
              Oficina de demonstração
            </span>
          </div>
        </CardContent>
      </Card>

      <FormMessage state={state} />

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="sm:min-w-[160px]">
          {isPending ? "A guardar…" : "Guardar alterações"}
        </Button>
      </div>
    </form>
  );
}
