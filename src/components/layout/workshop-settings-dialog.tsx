"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useWorkshopStore } from "@/stores/workshop-store";

type WorkshopSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Definições da oficina. Por agora: registo do custo das peças (margem). */
export function WorkshopSettingsDialog({ open, onOpenChange }: WorkshopSettingsDialogProps) {
  const workshop = useWorkshopStore((s) => s.workshop);
  const role = useWorkshopStore((s) => s.role);
  const setTrackCosts = useWorkshopStore((s) => s.setTrackCosts);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = role === "owner";
  const trackCosts = workshop?.track_costs ?? false;

  async function change(value: boolean) {
    setError(null);
    setSaving(true);
    try {
      await setTrackCosts(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Definições da oficina</DialogTitle>
          <DialogDescription>{workshop?.name ?? ""}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 rounded-md border border-border p-4">
            <div className="grid gap-1">
              <Label htmlFor="track-costs" className="cursor-pointer">
                Custo das peças e margem
              </Label>
              <p id="track-costs-desc" className="m-0 text-sm text-muted-foreground">
                Acrescenta o custo de cada peça nas ordens de reparação e mostra a margem da ordem e
                do mês na Faturação. Desligar não apaga os custos já registados.
              </p>
            </div>
            <Switch
              id="track-costs"
              checked={trackCosts}
              onCheckedChange={(value) => void change(value)}
              disabled={!isOwner || saving || !workshop}
              aria-label="Registar o custo das peças"
            />
          </div>

          {!isOwner && (
            <p className="m-0 text-sm text-muted-foreground">
              Só o dono da oficina pode alterar esta opção.
            </p>
          )}
          {error && (
            <p className="m-0 flex items-center gap-1.5 text-sm text-destructive" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
