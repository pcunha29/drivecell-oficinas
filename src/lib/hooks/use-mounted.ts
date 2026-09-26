import { useSyncExternalStore } from "react";

/** Evita mismatch de hidratação em conteúdo que depende do cliente. */
export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
