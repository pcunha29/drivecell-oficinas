"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeMemberAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

/** Remover um membro da oficina (confirmação em dois cliques). */
export function RemoveMemberButton({ workshopId, userId, label }: { workshopId: string; userId: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const res = await removeMemberAction(workshopId, userId);
      if (res.status === "success") toast.success(res.message);
      else toast.error(res.message);
      setConfirming(false);
    });
  }

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label={`Remover ${label}`}>
        Remover
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      <Button type="button" variant="destructive" size="sm" onClick={remove} disabled={isPending}>
        {isPending ? "A remover…" : "Remover mesmo"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={isPending}>
        Cancelar
      </Button>
    </div>
  );
}
