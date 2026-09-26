import { createClient } from "@/lib/supabase/client";
import type { CustomerRow } from "@/lib/supabase/database.types";
import { compareCustomerSlugs } from "@/lib/customer-slug";
import { customerToRow, mapCustomer } from "@/lib/supabase/mappers";
import type { Customer } from "@/types";

export async function fetchCustomers(): Promise<Customer[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("customers").select("*");

  if (error) throw error;
  return (data as CustomerRow[])
    .map(mapCustomer)
    .sort((a, b) => compareCustomerSlugs(a.slug, b.slug));
}

/** O slug (`c-N`) e a oficina são preenchidos pela base de dados. */
export async function createCustomer(
  input: Omit<Customer, "id" | "slug">,
): Promise<Customer> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert(customerToRow(input))
    .select()
    .single();

  if (error) throw error;
  return mapCustomer(data as CustomerRow);
}

export async function updateCustomer(
  id: string,
  input: Partial<Omit<Customer, "id" | "slug">>,
): Promise<Customer> {
  const supabase = createClient();
  const row: Record<string, string> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.phone !== undefined) row.phone = input.phone;
  if (input.email !== undefined) row.email = input.email;
  if (input.notes !== undefined) row.notes = input.notes;

  const { data, error } = await supabase
    .from("customers")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapCustomer(data as CustomerRow);
}

/** Viaturas e ordens do cliente são apagadas em cascata pela base de dados. */
export async function deleteCustomer(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}
