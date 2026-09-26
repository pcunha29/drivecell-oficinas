"use client";

import { useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferencesStore } from "@/stores/preferences-store";

export function PricesVisibilityToggle() {
  const pricesVisible = usePreferencesStore((s) => s.pricesVisible);
  const togglePricesVisible = usePreferencesStore((s) => s.togglePricesVisible);
  const hydratePreferences = usePreferencesStore((s) => s.hydrate);

  useEffect(() => {
    hydratePreferences();
  }, [hydratePreferences]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={togglePricesVisible}
      className="min-h-[44px] min-w-[44px]"
      aria-label={pricesVisible ? "Ocultar preços" : "Mostrar preços"}
      title={
        pricesVisible
          ? "Ocultar preços (para mostrar a clientes)"
          : "Mostrar preços"
      }
    >
      {pricesVisible ? (
        <Eye className="h-5 w-5" />
      ) : (
        <EyeOff className="h-5 w-5" />
      )}
    </Button>
  );
}
