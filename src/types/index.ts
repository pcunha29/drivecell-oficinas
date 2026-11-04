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
  /** Chegada prevista ("AAAA-MM-DD") e hora opcional ("HH:MM"). Aparece nas Marcações. */
  expectedOn?: string | null;
  expectedTime?: string | null;
};

/** Correção manual das datas: chave presente = grava (null apaga); ausente = não mexe. */
export type OrderDates = {
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  /** "AAAA-MM-DD" */
  expectedOn?: string | null;
  /** "HH:MM" */
  expectedTime?: string | null;
};

export type AppointmentStatus = "scheduled" | "canceled" | "no_show";

/** Marcação feita à mão no calendário (as ordens com chegada prevista aparecem à parte). */
export type Appointment = {
  id: string;
  serviceType: string;
  customerName: string;
  phone: string;
  plate: string;
  customerId: string | null;
  vehicleId: string | null;
  /** "AAAA-MM-DD" */
  day: string;
  /** "HH:MM"; null = sem hora. */
  startTime: string | null;
  /** "HH:MM"; null = hora certa (ou sem hora). */
  endTime: string | null;
  status: AppointmentStatus;
  notes: string;
};

export type AppointmentInput = Omit<Appointment, "id">;
