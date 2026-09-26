"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { createWorkshopAction } from "@/app/admin/actions";
import { FieldError, FormMessage } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AdminFormState } from "@/lib/admin/schemas";

const initialState: AdminFormState = { status: "idle" };

export function NewWorkshopForm() {
  const [state, formAction, isPending] = useActionState(createWorkshopAction, initialState);
  const [, startTransition] = useTransition();
  const [initialStatus, setInitialStatus] = useState<"trialing" | "active">("trialing");
  const errors = state.fieldErrors ?? {};

  // Submissão manual para o React não limpar o formulário quando há erros.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Oficina</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome da oficina</Label>
            <Input id="name" name="name" required maxLength={80} autoComplete="off" />
            <FieldError errors={errors.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" type="tel" maxLength={32} autoComplete="off" />
            <FieldError errors={errors.phone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nif">NIF (opcional)</Label>
            <Input id="nif" name="nif" inputMode="numeric" maxLength={11} autoComplete="off" />
            <FieldError errors={errors.nif} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dono</CardTitle>
          <p className="text-sm text-muted-foreground">
            Recebe um convite por email para definir a palavra-passe. Se o email já tiver conta,
            é usada a conta existente e não é enviado convite.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ownerName">Nome do dono</Label>
            <Input id="ownerName" name="ownerName" required maxLength={120} autoComplete="off" />
            <FieldError errors={errors.ownerName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownerEmail">Email do dono</Label>
            <Input id="ownerEmail" name="ownerEmail" type="email" required autoComplete="off" />
            <FieldError errors={errors.ownerEmail} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscrição</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="initialStatus">Estado inicial</Label>
            <Select
              id="initialStatus"
              name="initialStatus"
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value as "trialing" | "active")}
            >
              <option value="trialing">Em teste</option>
              <option value="active">Ativa</option>
            </Select>
            <FieldError errors={errors.initialStatus} />
          </div>
          {initialStatus === "trialing" && (
            <div className="space-y-2">
              <Label htmlFor="trialDays">Dias de teste</Label>
              <Input
                id="trialDays"
                name="trialDays"
                type="number"
                min={1}
                max={365}
                defaultValue={14}
              />
              <FieldError errors={errors.trialDays} />
            </div>
          )}
          <label className="flex items-start gap-3 sm:col-span-2">
            <input
              type="checkbox"
              name="isDemo"
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
            />
            <span className="text-sm">
              <span className="font-medium">Oficina de demonstração</span>
              <span className="block text-muted-foreground">
                Carrega clientes, viaturas e ordens de exemplo e permite repô-los mais tarde.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <FormMessage state={state} />

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="sm:min-w-[200px]">
          {isPending ? "A criar…" : "Criar oficina e convidar"}
        </Button>
      </div>
    </form>
  );
}
