import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import {
  WORKSHOP_SELECT,
  WORKSHOP_SELECT_BASE,
  workshopCanWrite,
  type Workshop,
} from "@/lib/workshop";

type WorkshopRole = "owner" | "member";

type WorkshopStore = {
  workshop: Workshop | null;
  /** Papel do utilizador na oficina (só o dono altera definições). */
  role: WorkshopRole | null;
  /** Calculado como a função SQL `can_write` no momento em que a oficina foi carregada. */
  canWrite: boolean;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  /** Liga/desliga o registo do custo das peças (só o dono; o RLS confirma). */
  setTrackCosts: (value: boolean) => Promise<void>;
};

type MembershipRow = { role: WorkshopRole; workshops: Workshop | Workshop[] | null };

export const useWorkshopStore = create<WorkshopStore>((set, get) => ({
  workshop: null,
  role: null,
  canWrite: false,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        set({ workshop: null, role: null, canWrite: false, isLoading: false });
        return;
      }

      // Mesma escolha que current_workshop_id(): primeiro onde é owner.
      const fetchMembership = (columns: string) =>
        supabase
          .from("workshop_members")
          .select(`role, workshops (${columns})`)
          .eq("user_id", user.id)
          .order("role", { ascending: false })
          .order("workshop_id")
          .limit(1)
          .maybeSingle();

      let { data, error } = await fetchMembership(WORKSHOP_SELECT);

      // Coluna em falta (migração ainda por aplicar, erro 42703): carrega sem as colunas
      // opcionais em vez de deixar a app inteira em só-leitura.
      if (error?.code === "42703") {
        console.warn(
          "[oficina] Falta uma coluna na tabela workshops — aplica as migrações em falta.",
          error.message,
        );
        ({ data, error } = await fetchMembership(WORKSHOP_SELECT_BASE));
      }

      if (error) throw error;

      const membership = data as MembershipRow | null;
      const embedded = membership?.workshops ?? null;
      const workshop = Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;

      set({
        workshop,
        role: workshop ? (membership?.role ?? null) : null,
        canWrite: workshop ? workshopCanWrite(workshop) : false,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Erro ao carregar a oficina",
      });
    }
  },

  setTrackCosts: async (value) => {
    const workshop = get().workshop;
    if (!workshop) throw new Error("Sem oficina");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("workshops")
      .update({ track_costs: value })
      .eq("id", workshop.id)
      .select("track_costs");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Só o dono da oficina pode alterar esta opção.");
    }
    set({ workshop: { ...workshop, track_costs: value } });
  },
}));

/** Oficina atual e se a conta pode criar/alterar/apagar registos. */
export function useWorkshop() {
  const workshop = useWorkshopStore((s) => s.workshop);
  const canWrite = useWorkshopStore((s) => s.canWrite);
  return { workshop, canWrite };
}

/** Atalho para os componentes que só precisam de saber se podem escrever. */
export function useCanWrite(): boolean {
  return useWorkshopStore((s) => s.canWrite);
}

/** A oficina regista o custo das peças (coluna de custo e margem). */
export function useTrackCosts(): boolean {
  return useWorkshopStore((s) => s.workshop?.track_costs ?? false);
}
