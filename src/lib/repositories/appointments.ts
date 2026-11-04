import { createClient } from "@/lib/supabase/client";
import type { AppointmentRow } from "@/lib/supabase/database.types";
import { appointmentToRow, mapAppointment } from "@/lib/supabase/mappers";
import type { Appointment, AppointmentInput } from "@/types";

/** Marcações entre dois dias (inclusive), por dia e hora. */
export async function fetchAppointments(from: string, to: string): Promise<Appointment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .gte("day", from)
    .lte("day", to)
    .order("day")
    .order("start_time", { nullsFirst: true });

  if (error) throw error;
  return (data as AppointmentRow[]).map(mapAppointment);
}

export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert(appointmentToRow(input))
    .select("*")
    .single();

  if (error) throw error;
  return mapAppointment(data as AppointmentRow);
}

export async function updateAppointment(id: string, input: AppointmentInput): Promise<Appointment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update(appointmentToRow(input))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  // Sem linha: outra oficina, já apagada, ou conta em só-leitura (o RLS filtra).
  if (!data) throw new Error("not_found");
  return mapAppointment(data as AppointmentRow);
}

export async function deleteAppointment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}
