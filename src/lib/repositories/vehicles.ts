import { createClient } from "@/lib/supabase/client";
import type { VehicleRow } from "@/lib/supabase/database.types";
import { mapVehicle, vehicleToRow } from "@/lib/supabase/mappers";
import type { Vehicle } from "@/types";

export async function fetchVehicles(): Promise<Vehicle[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("plate");

  if (error) throw error;
  return (data as VehicleRow[]).map(mapVehicle);
}

export async function createVehicle(
  input: Omit<Vehicle, "id">,
): Promise<Vehicle> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert(vehicleToRow(input))
    .select()
    .single();

  if (error) throw error;
  return mapVehicle(data as VehicleRow);
}

export async function updateVehicle(
  id: string,
  input: Partial<Omit<Vehicle, "id">>,
): Promise<Vehicle> {
  const supabase = createClient();
  const row: Record<string, string | number> = {};
  if (input.customerId !== undefined) row.customer_id = input.customerId;
  if (input.plate !== undefined) row.plate = input.plate;
  if (input.make !== undefined) row.make = input.make;
  if (input.model !== undefined) row.model = input.model;
  if (input.year !== undefined) row.year = input.year;

  const { data, error } = await supabase
    .from("vehicles")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapVehicle(data as VehicleRow);
}

/** As ordens da viatura são apagadas em cascata pela base de dados. */
export async function deleteVehicle(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}
