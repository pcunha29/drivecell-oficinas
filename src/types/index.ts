export type Customer = {
  id: string;
  slug: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
};

export type Vehicle = {
  id: string;
  customerId: string;
  plate: string;
  make: string;
  model: string;
  year: number;
};

export type OrderStatus =
  | "waiting"
  | "in_progress"
  | "done"
  | "delivered";

export type ServiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type ServiceOrder = {
  id: string;
  vehicleId: string;
  customerId: string;
  status: OrderStatus;
  description: string;
  notes: string;
  paid: boolean;
  items: ServiceItem[];
  createdAt: string;
  updatedAt: string;
};
