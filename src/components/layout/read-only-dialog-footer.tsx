"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Rodapé dos diálogos quando a conta está em só-leitura: só permite fechar. */
export function ReadOnlyDialogFooter({ onClose }: { onClose: () => void }) {
  return (
    <div className="-mx-6 -mb-6 mt-2 rounded-b-lg border-t border-border bg-muted/30 px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          Conta em só-leitura.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="min-h-[44px] touch-manipulation"
        >
          Fechar
        </Button>
      </div>
    </div>
  );
}
