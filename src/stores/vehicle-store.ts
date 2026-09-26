import { create } from "zustand";
import type { Vehicle } from "@/types";
import * as vehiclesRepo from "@/lib/repositories/vehicles";
import { useOrderStore } from "@/stores/order-store";

type VehicleStore = {
  vehicles: Vehicle[];
  isLoading: boolean;
  error: string | null;
  setVehicles: (vehicles: Vehicle[]) => void;
  load: () => Promise<void>;
  addVehicle: (input: Omit<Vehicle, "id">) => Promise<Vehicle>;
  updateVehicle: (
    id: string,
    updates: Partial<Omit<Vehicle, "id">>,
  ) => Promise<Vehicle>;
  removeVehicle: (id: string) => Promise<void>;
  removeVehiclesByCustomerId: (customerId: string) => void;
  getVehicleById: (id: string) => Vehicle | undefined;
  getVehiclesByCustomerId: (customerId: string) => Vehicle[];
};

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  vehicles: [],
  isLoading: false,
  error: null,

  setVehicles: (vehicles) => set({ vehicles }),

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const vehicles = await vehiclesRepo.fetchVehicles();
      set({ vehicles, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Erro ao carregar viaturas",
      });
    }
  },

  addVehicle: async (input) => {
    const vehicle = await vehiclesRepo.createVehicle(input);
    set((state) => ({ vehicles: [...state.vehicles, vehicle] }));
    return vehicle;
  },

  updateVehicle: async (id, updates) => {
    const vehicle = await vehiclesRepo.updateVehicle(id, updates);
    set((state) => ({
      vehicles: state.vehicles.map((v) => (v.id === id ? vehicle : v)),
    }));
    return vehicle;
  },

  removeVehicle: async (id) => {
    await vehiclesRepo.deleteVehicle(id);
    useOrderStore.getState().removeOrdersByVehicleId(id);
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v.id !== id),
    }));
  },

  removeVehiclesByCustomerId: (customerId) =>
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v.customerId !== customerId),
    })),

  getVehicleById: (id) => get().vehicles.find((v) => v.id === id),

  getVehiclesByCustomerId: (customerId) =>
    get().vehicles.filter((v) => v.customerId === customerId),
}));
