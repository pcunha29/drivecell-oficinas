"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteInteressadoAction,
  setInteressadoContactedAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** Ações por linha da lista de interessados: marcar contactado e apagar (com confirmação). */
export function InteressadoActions({ id, contacted }: { id: string; contacted: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ status: "success" | "error"; message: string }>) {
    startTransition(async () => {
      const res = await action();
      if (res.status === "error") toast.error(res.message);
      else toast.success(res.message);
      setConfirming(false);
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => setInteressadoContactedAction(id, !contacted))}
      >
        {contacted ? "Desmarcar" : "Contactado"}
      </Button>
      {confirming ? (
        <>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => run(() => deleteInteressadoAction(id))}
          >
            Apagar mesmo
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </>
      ) : (
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(true)}>
          Apagar
        </Button>
      )}
    </div>
  );
}
