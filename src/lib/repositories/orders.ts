import { createClient } from "@/lib/supabase/client";
import type { ServiceOrderRow } from "@/lib/supabase/database.types";
import { mapServiceOrder } from "@/lib/supabase/mappers";
import type { OrderDates, OrderStatus, ServiceItem, ServiceOrder } from "@/types";

const ORDER_SELECT = `
  *,
  service_order_items (*)
`;

export type OrderUpdate = Partial<
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
> & {
  /** Correção manual da entrada/saída (só as chaves alteradas). */
  dates?: OrderDates;
};

export async function fetchOrders(): Promise<ServiceOrder[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "service_order_items" });

  if (error) throw error;
  return (data as ServiceOrderRow[]).map(mapServiceOrder);
}

export async function fetchOrderById(
  id: string,
): Promise<ServiceOrder | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("service_orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .order("position", { referencedTable: "service_order_items" })
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;
  return mapServiceOrder(data as ServiceOrderRow);
}

function itemsToJson(items: ServiceItem[]) {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitCost: item.unitCost ?? null,
  }));
}

/**
 * Grava a ordem e as linhas numa só transação (RPC `save_order`).
 * `orderId` null = criar. Campos em falta (null) mantêm o valor atual;
 * `items` em falta não mexe nas linhas.
 */
async function saveOrder(
  orderId: string | null,
  input: OrderUpdate,
): Promise<ServiceOrder> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("save_order", {
    p_order_id: orderId,
    p_customer_id: input.customerId ?? null,
    p_vehicle_id: input.vehicleId ?? null,
    p_status: input.status ?? null,
    p_description: input.description ?? null,
    p_notes: input.notes ?? null,
    p_paid: input.paid ?? null,
    p_items: input.items ? itemsToJson(input.items) : null,
    // Só enviado quando há correções: assim funciona também antes da migração de entrada/saída.
    ...(input.dates && Object.keys(input.dates).length > 0 ? { p_dates: input.dates } : {}),
  });

  if (error) throw error;

  const id = (data as string | null) ?? orderId;
  if (!id) throw new Error("Não foi possível gravar a ordem");

  const order = await fetchOrderById(id);
  if (!order) throw new Error("Ordem gravada mas não encontrada");
  return order;
}

export async function createOrder(
  input: Omit<ServiceOrder, "id" | "createdAt" | "updatedAt"> & { dates?: OrderDates },
): Promise<ServiceOrder> {
  return saveOrder(null, {
    ...input,
    notes: input.notes ?? "",
    paid: input.paid ?? false,
  });
}

export async function updateOrder(
  id: string,
  input: OrderUpdate,
): Promise<ServiceOrder> {
  return saveOrder(id, input);
}

export async function moveOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<ServiceOrder> {
  const supabase = createClient();
  const { error } = await supabase
    .from("service_orders")
    .update({ status })
    .eq("id", id);
  if (error) throw error;

  const order = await fetchOrderById(id);
  if (!order) throw new Error("Ordem não encontrada após atualização");
  return order;
}

export async function deleteOrder(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("service_orders").delete().eq("id", id);
  if (error) throw error;
}
