import { create } from "zustand";
import type { Customer } from "@/types";
import * as customersRepo from "@/lib/repositories/customers";
import { useOrderStore } from "@/stores/order-store";
import { useVehicleStore } from "@/stores/vehicle-store";

type CustomerStore = {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  setCustomers: (customers: Customer[]) => void;
  load: () => Promise<void>;
  addCustomer: (input: Omit<Customer, "id" | "slug">) => Promise<Customer>;
  updateCustomer: (
    id: string,
    updates: Partial<Omit<Customer, "id" | "slug">>,
  ) => Promise<Customer>;
  removeCustomer: (id: string) => Promise<void>;
  getCustomerById: (id: string) => Customer | undefined;
  getCustomerBySlug: (slug: string) => Customer | undefined;
};

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customers: [],
  isLoading: false,
  error: null,

  setCustomers: (customers) => set({ customers }),

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const customers = await customersRepo.fetchCustomers();
      set({ customers, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Erro ao carregar clientes",
      });
    }
  },

  addCustomer: async (input) => {
    const customer = await customersRepo.createCustomer(input);
    set((state) => ({ customers: [...state.customers, customer] }));
    return customer;
  },

  updateCustomer: async (id, updates) => {
    const customer = await customersRepo.updateCustomer(id, updates);
    set((state) => ({
      customers: state.customers.map((c) => (c.id === id ? customer : c)),
    }));
    return customer;
  },

  removeCustomer: async (id) => {
    await customersRepo.deleteCustomer(id);
    useOrderStore.getState().removeOrdersByCustomerId(id);
    useVehicleStore.getState().removeVehiclesByCustomerId(id);
    set((state) => ({
      customers: state.customers.filter((c) => c.id !== id),
    }));
  },

  getCustomerById: (id) => get().customers.find((c) => c.id === id),

  getCustomerBySlug: (slug) => get().customers.find((c) => c.slug === slug),
}));
