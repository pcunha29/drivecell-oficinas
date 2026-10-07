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
  /** Custo unitário (peças). null = não registado. */
  unitCost?: number | null;
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
  /** Entrada da viatura na oficina (marcada ao passar a "Em curso"; corrigível). */
  checkedInAt?: string | null;
  /** Saída (entrega) da viatura; só existe nas ordens entregues. */
  checkedOutAt?: string | null;
};

/** Correção manual das datas: chave presente = grava (null apaga); ausente = não mexe. */
export type OrderDates = {
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
};
