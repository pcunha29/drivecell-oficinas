import type { Customer, ServiceItem, ServiceOrder, Vehicle } from "@/types";
import type {
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
