import { create } from "zustand";

const STORAGE_KEY = "drivecell-prices-visible";

type PreferencesStore = {
  pricesVisible: boolean;
  setPricesVisible: (visible: boolean) => void;
  togglePricesVisible: () => void;
  hydrate: () => void;
};

function getStored(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "false") return false;
  if (stored === "true") return true;
  return false;
}

export const usePreferencesStore = create<PreferencesStore>((set, get) => ({
  pricesVisible: false,

  setPricesVisible: (visible) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(visible));
    }
    set({ pricesVisible: visible });
  },

  togglePricesVisible: () => {
    const next = !get().pricesVisible;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(next));
    }
    set({ pricesVisible: next });
  },

  hydrate: () => {
    set({ pricesVisible: getStored() });
  },
}));
