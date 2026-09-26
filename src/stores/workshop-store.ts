import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { WORKSHOP_SELECT, workshopCanWrite, type Workshop } from "@/lib/workshop";

type WorkshopStore = {
  workshop: Workshop | null;
  /** Calculado como a função SQL `can_write` no momento em que a oficina foi carregada. */
  canWrite: boolean;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
};

type MembershipRow = { workshops: Workshop | Workshop[] | null };

export const useWorkshopStore = create<WorkshopStore>((set) => ({
  workshop: null,
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
        set({ workshop: null, canWrite: false, isLoading: false });
        return;
      }

      // Mesma escolha que current_workshop_id(): primeiro onde é owner.
      const { data, error } = await supabase
        .from("workshop_members")
        .select(`role, workshops (${WORKSHOP_SELECT})`)
        .eq("user_id", user.id)
        .order("role", { ascending: false })
        .order("workshop_id")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const embedded = (data as MembershipRow | null)?.workshops ?? null;
      const workshop = Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;

      set({
        workshop,
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
