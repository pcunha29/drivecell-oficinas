"use client";

import { useState, useTransition } from "react";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { resendInviteAction, type ResendInviteResult } from "@/app/admin/actions";
import { FormMessage } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResendInviteButton({
  workshopId,
  userId,
}: {
  workshopId: string;
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ResendInviteResult | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await resendInviteAction(workshopId, userId));
      } catch {
        setResult({ status: "error", message: "Não foi possível reenviar o convite." });
      }
    });
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Seleciona o link e copia à mão.");
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        <Mail aria-hidden />
        {isPending ? "A reenviar…" : "Reenviar convite"}
      </Button>
      {result && <FormMessage state={result} />}
      {result?.link && (
        <div className="flex gap-2">
          <Input readOnly value={result.link} onFocus={(e) => e.currentTarget.select()} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => copyLink(result.link!)}
            aria-label="Copiar link"
          >
            <Copy aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
