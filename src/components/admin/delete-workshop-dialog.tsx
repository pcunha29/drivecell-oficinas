"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteWorkshopAction } from "@/app/admin/actions";
import { FormMessage } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  workshopId: string;
  workshopName: string;
  customerCount: number;
  orderCount: number;
  memberCount: number;
};

/** Eliminar a oficina a pedido do cliente: confirma escrevendo o nome. */
export function DeleteWorkshopDialog({ workshopId, workshopName, customerCount, orderCount, memberCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleteUsers, setDeleteUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();
  const usersId = useId();

  const matches = typed.trim() === workshopName.trim();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteWorkshopAction(workshopId, typed, deleteUsers);
        if (result.status === "success") {
          toast.success(result.message);
          setOpen(false);
          router.replace("/admin");
        } else {
          setError(result.message);
        }
      } catch {
        setError("Não foi possível eliminar a oficina.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        setOpen(next);
        if (!next) {
          setError(null);
          setTyped("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          <Trash2 aria-hidden />
          Eliminar oficina
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar «{workshopName}»?</DialogTitle>
          <DialogDescription>
            Apaga para sempre {customerCount} clientes, {orderCount} ordens, as viaturas e o acesso dos{" "}
            {memberCount} membros. Não é possível desfazer. Se o cliente quiser os dados, exporta-os antes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={inputId}>
              Escreve <strong className="font-semibold">{workshopName}</strong> para confirmar
            </Label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <label htmlFor={usersId} className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              id={usersId}
              type="checkbox"
              checked={deleteUsers}
              onChange={(e) => setDeleteUsers(e.target.checked)}
              className="mt-0.5 size-4 accent-red-600"
            />
            <span>
              Apagar também as contas de acesso dos membros (e as fotos de perfil). Contas que
              pertençam a outra oficina ou de admin mantêm-se.
            </span>
          </label>
        </div>

        {error && <FormMessage state={{ status: "error", message: error }} />}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={!matches || isPending}>
            {isPending ? "A eliminar…" : "Eliminar para sempre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
