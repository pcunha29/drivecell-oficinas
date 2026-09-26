"use client";

import Link from "next/link";
import { useActionState, useTransition, type FormEvent } from "react";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { createDemoAccountAction, type DemoAccountState } from "@/app/admin/actions";
import { FieldError, FormMessage } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: DemoAccountState = { status: "idle" };

/**
 * Atalho para criar a conta demo. Fica sempre montado (mesmo depois de a oficina
 * existir) para que as credenciais continuem visíveis após o revalidatePath.
 */
export function DemoAccountCard({ hasDemo }: { hasDemo: boolean }) {
  const [state, formAction, isPending] = useActionState(createDemoAccountAction, initialState);
  const [, startTransition] = useTransition();
  const credentials = state.credentials;

  if (hasDemo && !credentials) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  if (credentials) {
    return (
      <Card className="border-emerald-300 dark:border-emerald-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" aria-hidden />
            Conta de demonstração criada
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Guarda agora a palavra-passe (ex.: no gestor de palavras-passe). Não volta a ser
            mostrada — se a perderes, gera um link em «Reenviar convite» no detalhe da oficina.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Email", value: credentials.email },
            { label: "Palavra-passe", value: credentials.password },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <Label>{item.label}</Label>
              <div className="flex gap-2">
                <Input readOnly value={item.value} className="font-mono" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copy(item.value)}
                  aria-label={`Copiar ${item.label.toLowerCase()}`}
                >
                  <Copy aria-hidden />
                </Button>
              </div>
            </div>
          ))}
          <Button asChild variant="link" className="px-0">
            <Link href={`/admin/${credentials.workshopId}`}>Ver oficina de demonstração</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta demo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cria um utilizador com palavra-passe gerada e a oficina «Oficina Ferreira &amp; Filhos»
          (ativa, com dados de exemplo) para mostrar a clientes.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="demo-email">Email da conta demo</Label>
              <Input
                id="demo-email"
                name="email"
                type="email"
                defaultValue="demo@drivecell.pt"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "A criar…" : "Criar conta demo"}
            </Button>
          </div>
          <FieldError errors={state.fieldErrors?.email} />
          <FormMessage state={state} />
        </form>
      </CardContent>
    </Card>
  );
}
