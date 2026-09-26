"use client";

import { useState, useTransition } from "react";
import { setUnderConstructionAction, type SimpleActionResult } from "@/app/admin/actions";
import { FormMessage } from "@/components/admin/form-feedback";
import { Switch } from "@/components/ui/switch";

/** Interruptor do modo "em construção" (efeito imediato: o middleware lê o valor em cada pedido). */
export function SiteModeToggle({ initialOn }: { initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [result, setResult] = useState<SimpleActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    const previous = on;
    setOn(next);
    setResult(null);
    startTransition(async () => {
      const res = await setUnderConstructionAction(next);
      if (res.status === "error") setOn(previous);
      setResult(res);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p id="modo-construcao" className="font-medium">
            Modo em construção
          </p>
          <p className="text-sm text-muted-foreground">
            {on
              ? "Ligado. Quem visita / ou /precos vê a página de espera. Tu (admin) continuas a ver o site real."
              : "Desligado. O site público está aberto a todos."}
          </p>
        </div>
        <Switch
          checked={on}
          onCheckedChange={change}
          disabled={pending}
          aria-labelledby="modo-construcao"
        />
      </div>
      {result && <FormMessage state={result} />}
    </div>
  );
}
