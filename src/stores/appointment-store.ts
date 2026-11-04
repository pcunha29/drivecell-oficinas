import { create } from "zustand";
import type { Appointment, AppointmentInput } from "@/types";
import * as appointmentsRepo from "@/lib/repositories/appointments";

type AppointmentStore = {
  appointments: Appointment[];
  /** Dias carregados (inclusive); null = nada carregado. */
  range: { from: string; to: string } | null;
  isLoading: boolean;
  error: string | null;
  /** Carrega um intervalo de dias. `silent` não mostra «a carregar» (refrescar ao voltar à app). */
  loadRange: (from: string, to: string, options?: { silent?: boolean }) => Promise<void>;
  addAppointment: (input: AppointmentInput) => Promise<Appointment>;
  updateAppointment: (id: string, input: AppointmentInput) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;
};

export const useAppointmentStore = create<AppointmentStore>((set, get) => ({
  appointments: [],
  range: null,
  isLoading: false,
  error: null,

  loadRange: async (from, to, options) => {
    if (!options?.silent) set({ isLoading: true, error: null });
    try {
      const appointments = await appointmentsRepo.fetchAppointments(from, to);
      // Ignora respostas de um intervalo que entretanto deixou de ser o pedido.
      const current = get().range;
      if (current && (current.from !== from || current.to !== to)) return;
      set({ appointments, range: { from, to }, isLoading: false, error: null });
    } catch {
      set({ isLoading: false, error: "Não foi possível carregar as marcações." });
    }
  },

  addAppointment: async (input) => {
    const appointment = await appointmentsRepo.createAppointment(input);
    set((state) => ({ appointments: [...state.appointments, appointment] }));
    return appointment;
  },

  updateAppointment: async (id, input) => {
    const appointment = await appointmentsRepo.updateAppointment(id, input);
    set((state) => ({
      appointments: state.appointments.map((a) => (a.id === id ? appointment : a)),
    }));
    return appointment;
  },

  deleteAppointment: async (id) => {
    await appointmentsRepo.deleteAppointment(id);
    set((state) => ({ appointments: state.appointments.filter((a) => a.id !== id) }));
  },
}));
