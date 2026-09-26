"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { resetDemoDataAction } from "@/app/admin/actions";
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

export function ResetDemoDialog({
  workshopId,
  workshopName,
}: {
  workshopId: string;
  workshopName: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await resetDemoDataAction(workshopId);
        if (result.status === "success") {
          toast.success(result.message);
          setOpen(false);
        } else {
          setError(result.message);
        }
      } catch {
        setError("Não foi possível repor os dados.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <RotateCcw aria-hidden />
          Repor dados de demonstração
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repor dados de demonstração?</DialogTitle>
          <DialogDescription>
            Todos os clientes, viaturas e ordens de «{workshopName}» vão ser apagados e
            substituídos pelos dados de exemplo. Não é possível desfazer.
          </DialogDescription>
        </DialogHeader>
        {error && <FormMessage state={{ status: "error", message: error }} />}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "A repor…" : "Apagar e repor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
