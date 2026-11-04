import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata: Metadata = { title: "Marcações" };

export default function MarcacoesPage() {
  return <CalendarView />;
}
