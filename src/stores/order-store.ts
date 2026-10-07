import { create } from "zustand";
import type { OrderDates, ServiceOrder, OrderStatus } from "@/types";
import * as ordersRepo from "@/lib/repositories/orders";

type OrderStore = {
  orders: ServiceOrder[];
  isLoading: boolean;
  error: string | null;
  setOrders: (orders: ServiceOrder[]) => void;
  load: () => Promise<void>;
  addOrder: (
    input: Omit<ServiceOrder, "id" | "createdAt" | "updatedAt"> & { dates?: OrderDates },
  ) => Promise<ServiceOrder>;
  updateOrder: (
    id: string,
    updates: Partial<
      Pick<
        ServiceOrder,
        | "customerId"
        | "vehicleId"
        | "status"
        | "description"
        | "notes"
        | "paid"
        | "items"
      >
    > & { dates?: OrderDates },
  ) => Promise<ServiceOrder>;
  moveOrder: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  removeOrder: (id: string) => void;
  removeOrdersByCustomerId: (customerId: string) => void;
  removeOrdersByVehicleId: (vehicleId: string) => void;
  getOrderById: (id: string) => ServiceOrder | undefined;
  getOrdersByStatus: (status: OrderStatus) => ServiceOrder[];
};

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,

  setOrders: (orders) => set({ orders }),

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const orders = await ordersRepo.fetchOrders();
      set({ orders, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Erro ao carregar ordens",
      });
    }
  },

  addOrder: async (input) => {
    const order = await ordersRepo.createOrder(input);
    set((state) => ({ orders: [order, ...state.orders] }));
    return order;
  },

  updateOrder: async (id, updates) => {
    const order = await ordersRepo.updateOrder(id, updates);
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? order : o)),
    }));
    return order;
  },

  moveOrder: async (id, status) => {
    const order = await ordersRepo.moveOrderStatus(id, status);
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? order : o)),
    }));
  },

  deleteOrder: async (id) => {
    await ordersRepo.deleteOrder(id);
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== id),
    }));
  },

  removeOrder: (id) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.id !== id),
    })),

  removeOrdersByCustomerId: (customerId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.customerId !== customerId),
    })),

  removeOrdersByVehicleId: (vehicleId) =>
    set((state) => ({
      orders: state.orders.filter((o) => o.vehicleId !== vehicleId),
    })),

  getOrderById: (id) => get().orders.find((o) => o.id === id),

  getOrdersByStatus: (status) =>
    get().orders.filter((o) => o.status === status),
}));
