"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/** Blocos da página de Faturação que o utilizador pode mostrar/esconder. */
export type BillingBlockId =
  | "resumo"
  | "por-cobrar"
  | "abaixo-custo"
  | "lucro-mes"
  | "faturado-mes"
  | "evolucao"
  | "tempo-oficina"
  | "margem-ordem"
  | "top-clientes";

export type BillingBlock = {
  id: BillingBlockId;
  label: string;
  /** Só existe com a opção "Custo das peças e margem" ligada. */
  needsCosts?: boolean;
};

export const BILLING_BLOCKS: readonly BillingBlock[] = [
  { id: "resumo", label: "Resumo (faturado, custo e margem)" },
  { id: "por-cobrar", label: "Por cobrar" },
  { id: "abaixo-custo", label: "Vendido abaixo do custo", needsCosts: true },
  { id: "lucro-mes", label: "Lucro por mês", needsCosts: true },
  { id: "faturado-mes", label: "Faturado por mês" },
  { id: "evolucao", label: "Evolução da faturação" },
  { id: "tempo-oficina", label: "Tempo na oficina" },
  { id: "margem-ordem", label: "Margem por ordem", needsCosts: true },
  { id: "top-clientes", label: "Melhores clientes" },
];

/** Escondidos por omissão (a linha de evolução repete as barras). */
const DEFAULT_HIDDEN: BillingBlockId[] = ["evolucao"];

// Guarda os ESCONDIDOS: blocos novos aparecem por omissão a quem já personalizou.
const STORAGE_KEY = "drivecell.faturacao.blocos-escondidos.v1";
const CHANGE_EVENT = "drivecell:faturacao-blocos";

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function parse(raw: string | null): BillingBlockId[] {
  if (!raw) return DEFAULT_HIDDEN;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return DEFAULT_HIDDEN;
    const known = new Set<string>(BILLING_BLOCKS.map((b) => b.id));
    return value.filter((v): v is BillingBlockId => typeof v === "string" && known.has(v));
  } catch {
    return DEFAULT_HIDDEN;
  }
}

function write(hidden: BillingBlockId[] | null) {
  try {
    if (hidden === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
  } catch {
    // Sem armazenamento (modo privado, bloqueado): a escolha vale só nesta visita.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Blocos visíveis, guardados neste browser (localStorage), por utilizador/dispositivo. */
export function useBillingBlocks() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const hidden = useMemo(() => new Set(parse(raw)), [raw]);

  const isVisible = useCallback((id: BillingBlockId) => !hidden.has(id), [hidden]);

  const setVisible = useCallback(
    (id: BillingBlockId, visible: boolean) => {
      const next = new Set(hidden);
      if (visible) next.delete(id);
      else next.add(id);
      write([...next]);
    },
    [hidden],
  );

  const reset = useCallback(() => write(null), []);

  return { isVisible, setVisible, reset };
}
