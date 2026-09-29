"use client";

import { useActionState, useEffect, useRef } from "react";
import { Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { addMemberAction, type AddMemberState } from "@/app/admin/actions";
import { FieldError, FormMessage } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { whatsappShareUrl } from "@/lib/contact";

const initialState: AddMemberState = { status: "idle", message: "" };

/** Adicionar um mecânico (ou outro dono) a uma oficina já criada. */
export function AddMemberForm({ workshopId, workshopName }: { workshopId: string; workshopName: string }) {
  const [state, formAction, pending] = useActionState(addMemberAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  const inviteText = state.link
    ? `Olá! Criei o teu acesso ao DriveCell Oficinas (${workshopName}). Define a tua palavra-passe aqui: ${state.link}`
    : "";

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Seleciona o link e copia à mão.");
    }
  }

  return (
    <div className="space-y-3 border-t border-border p-4">
      <p className="text-sm font-medium">Adicionar membro</p>
      <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="workshopId" value={workshopId} />
        <div className="grid gap-1.5">
          <Label htmlFor="member-name">Nome</Label>
          <Input id="member-name" name="fullName" autoComplete="off" placeholder="Ex.: Rui Mecânico" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="member-email">Email</Label>
          <Input
            id="member-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            aria-describedby="member-email-error"
          />
          <FieldError id="member-email-error" errors={state.fieldErrors?.email} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="member-role">Papel</Label>
          <Select id="member-role" name="role" defaultValue="member">
            <option value="member">Membro (mecânico)</option>
            <option value="owner">Dono</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <UserPlus aria-hidden />
            {pending ? "A adicionar…" : "Adicionar"}
          </Button>
        </div>
      </form>
      <p className="text-xs text-muted-foreground">
        Membros usam o quadro, clientes e viaturas como o dono; só o dono altera as definições da
        oficina.
      </p>

      {state.status !== "idle" && <FormMessage state={state} />}
      {state.link && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input readOnly value={state.link} onFocus={(e) => e.currentTarget.select()} aria-label="Link de convite" />
            <Button type="button" variant="outline" size="icon" onClick={() => copy(state.link!)} aria-label="Copiar link">
              <Copy aria-hidden />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={whatsappShareUrl(inviteText)} target="_blank" rel="noopener noreferrer">
                Enviar por WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={`mailto:${state.email ?? ""}?subject=${encodeURIComponent("Acesso ao DriveCell Oficinas")}&body=${encodeURIComponent(inviteText)}`}
              >
                Enviar por email
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
