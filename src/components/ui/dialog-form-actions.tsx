"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogFormActionsProps = {
  onCancel: () => void;
  submitLabel: string;
  isSubmitting?: boolean;
  cancelDisabled?: boolean;
  deleteLabel?: string;
  onDelete?: () => void;
  error?: string | null;
};

export function DialogFormActions({
  onCancel,
  submitLabel,
  isSubmitting = false,
  cancelDisabled = false,
  deleteLabel,
  onDelete,
  error,
}: DialogFormActionsProps) {
  const showDelete = deleteLabel && onDelete;

  return (
    <div
      className={cn(
        // A partir de sm fica colado ao fundo do modal quando há scroll (-bottom-6 compensa o padding).
        // No telemóvel os botões empilhados ocupariam meio ecrã, por isso ficam no fim do formulário.
        "-mx-6 -mb-6 mt-2 border-t border-border bg-background px-6 py-4 sm:sticky sm:-bottom-6 sm:z-10",
        showDelete && "rounded-b-lg",
      )}
    >
      {error && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={cancelDisabled || isSubmitting}
            className="min-h-[44px] touch-manipulation"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] touch-manipulation sm:min-w-[140px]"
          >
            {isSubmitting ? "A guardar..." : submitLabel}
          </Button>
        </div>
        {showDelete && (
          <Button
            type="button"
            variant="ghost"
            className="min-h-[44px] text-destructive hover:bg-destructive/10 hover:text-destructive touch-manipulation sm:-ml-3"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            {deleteLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

type DialogDeleteConfirmProps = {
  title: string;
  description?: string;
  warning?: string;
  error?: string | null;
  isDeleting?: boolean;
  onBack: () => void;
  onConfirm: () => void;
};

export function DialogDeleteConfirm({
  title,
  description,
  warning,
  error,
  isDeleting = false,
  onBack,
  onConfirm,
}: DialogDeleteConfirmProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <Trash2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>
        {warning && (
          <p className="text-xs text-muted-foreground border-t border-destructive/20 pt-3">
            {warning}
          </p>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isDeleting}
          className="min-h-[44px]"
        >
          Voltar
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={onConfirm}
          disabled={isDeleting}
          className="min-h-[44px] sm:min-w-[140px]"
        >
          {isDeleting ? "A eliminar..." : "Eliminar"}
        </Button>
      </div>
    </div>
  );
}
