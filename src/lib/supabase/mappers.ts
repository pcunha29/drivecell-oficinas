import type { Appointment, AppointmentInput, Customer, ServiceItem, ServiceOrder, Vehicle } from "@/types";
import type {
  AppointmentRow,
  CustomerRow,
  ServiceOrderItemRow,
  ServiceOrderRow,
  VehicleRow,
} from "./database.types";

export function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
  };
}

export function mapVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    customerId: row.customer_id,
    plate: row.plate,
    make: row.make,
    model: row.model,
    year: row.year ?? 0,
  };
}

function mapServiceItem(row: ServiceOrderItemRow): ServiceItem {
  return {
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    unitCost: row.unit_cost == null ? null : Number(row.unit_cost),
  };
}

export function mapServiceOrder(row: ServiceOrderRow): ServiceOrder {
  return {
    id: row.id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    status: row.status,
    description: row.description,
    notes: row.notes ?? "",
    paid: row.paid ?? false,
    items: [...(row.service_order_items ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(mapServiceItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    checkedInAt: row.checked_in_at ?? null,
    checkedOutAt: row.checked_out_at ?? null,
    expectedOn: row.expected_on ?? null,
    expectedTime: shortTime(row.expected_time),
  };
}

/** "09:30:00" (Postgres) → "09:30"; null fica null. */
export function shortTime(value: string | null | undefined): string | null {
  return value ? value.slice(0, 5) : null;
}

export function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    serviceType: row.service_type,
    customerName: row.customer_name,
    phone: row.phone ?? "",
    plate: row.plate ?? "",
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    day: row.day,
    startTime: shortTime(row.start_time),
    endTime: shortTime(row.end_time),
    status: row.status,
    notes: row.notes ?? "",
  };
}

export function appointmentToRow(
  data: AppointmentInput,
): Pick<
  AppointmentRow,
  | "service_type"
  | "customer_name"
  | "phone"
  | "plate"
  | "customer_id"
  | "vehicle_id"
  | "day"
  | "start_time"
  | "end_time"
  | "status"
  | "notes"
> {
  return {
    service_type: data.serviceType,
    customer_name: data.customerName,
    phone: data.phone,
    plate: data.plate,
    customer_id: data.customerId,
    vehicle_id: data.vehicleId,
    day: data.day,
    start_time: data.startTime,
    end_time: data.startTime ? data.endTime : null,
    status: data.status,
    notes: data.notes,
  };
}

/** Sem slug: a base de dados gera `c-N` por oficina. */
export function customerToRow(
  data: Omit<Customer, "id" | "slug">,
): Pick<CustomerRow, "name" | "phone" | "email" | "notes"> {
  return {
    name: data.name,
    phone: data.phone,
    email: data.email,
    notes: data.notes,
  };
}

export function vehicleToRow(
  data: Omit<Vehicle, "id">,
): Pick<VehicleRow, "customer_id" | "plate" | "make" | "model" | "year"> {
  return {
    customer_id: data.customerId,
    plate: data.plate,
    make: data.make,
    model: data.model,
    year: data.year,
  };
}
