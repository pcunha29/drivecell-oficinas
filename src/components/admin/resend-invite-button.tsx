"use client";

import { useState, useTransition } from "react";
import { Copy, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  generateAccessLinkAction,
  resendInviteAction,
  type ResendInviteResult,
} from "@/app/admin/actions";
import { FormMessage } from "@/components/admin/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { whatsappShareUrl } from "@/lib/contact";

/**
 * Acesso de um membro: link de acesso sempre disponível (copiar / WhatsApp) e,
 * para quem ainda não entrou, reenviar o convite por email.
 */
export function ResendInviteButton({
  workshopId,
  userId,
  showEmail = true,
}: {
  workshopId: string;
  userId: string;
  showEmail?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ResendInviteResult | null>(null);

  function run(action: () => Promise<ResendInviteResult>, fallbackMessage: string) {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await action());
      } catch {
        setResult({ status: "error", message: fallbackMessage });
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
      <div className="flex flex-wrap gap-2">
        {showEmail && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => run(() => resendInviteAction(workshopId, userId), "Não foi possível reenviar o convite.")}
          >
            <Mail aria-hidden />
            Reenviar email
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          title="Cria um link novo de uso único. O link anterior deixa de funcionar."
          onClick={() => run(() => generateAccessLinkAction(workshopId, userId), "Não foi possível gerar o link.")}
        >
          <RefreshCw aria-hidden className={isPending ? "animate-spin" : undefined} />
          {result?.link ? "Gerar outro link" : "Gerar novo link"}
        </Button>
      </div>
      {result && <FormMessage state={result} />}
      {result?.link && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input readOnly value={result.link} onFocus={(e) => e.currentTarget.select()} aria-label="Link de acesso" />
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
          <Button asChild variant="outline" size="sm">
            <a
              href={whatsappShareUrl(`Olá! Este é o teu link de acesso ao DriveCell Oficinas: ${result.link}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Enviar por WhatsApp
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
