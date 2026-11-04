"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { OrderDialog } from "@/components/kanban/order-dialog";
import { AppointmentDialog } from "@/components/calendar/appointment-dialog";
import { DayAgenda } from "@/components/calendar/day-agenda";
import { WeekGrid } from "@/components/calendar/week-grid";
import { CalendarLegend } from "@/components/calendar/event-chip";
import {
  addDays,
  buildCalendarEvents,
  formatDayLong,
  formatWeekRange,
  nextHalfHour,
  nowMinutes as currentMinutes,
  todayKey,
  weekDays,
  type CalendarEvent,
} from "@/lib/calendar";
import { fetchOrders } from "@/lib/repositories/orders";
import { useAppointmentStore } from "@/stores/appointment-store";
import { useCustomerStore } from "@/stores/customer-store";
import { useOrderStore } from "@/stores/order-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { useCalendarEnabled, useCanWrite } from "@/stores/workshop-store";
import { cn } from "@/lib/utils";

type View = "semana" | "dia";

/** No telemóvel abre no Dia (lista); a partir de md na Semana (grelha). */
function initialView(): View {
  if (typeof window === "undefined") return "semana";
  return window.matchMedia("(min-width: 768px)").matches ? "semana" : "dia";
}

export function CalendarView() {
  const router = useRouter();
  const calendarEnabled = useCalendarEnabled();
  const canWrite = useCanWrite();

  const [view, setView] = useState<View>(initialView);
  const [today, setToday] = useState(() => todayKey());
  const [minutesNow, setMinutesNow] = useState(() => currentMinutes());
  const [anchor, setAnchor] = useState(today);

  const orders = useOrderStore((s) => s.orders);
  const setOrders = useOrderStore((s) => s.setOrders);
  const customers = useCustomerStore((s) => s.customers);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const appointments = useAppointmentStore((s) => s.appointments);
  const loadRange = useAppointmentStore((s) => s.loadRange);
  const isLoading = useAppointmentStore((s) => s.isLoading);
  const loadError = useAppointmentStore((s) => s.error);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const from = days[0];
  const to = days[6];

  const events = useMemo(
    () => buildCalendarEvents({ orders, appointments, customers, vehicles, from, to }),
    [orders, appointments, customers, vehicles, from, to],
  );

  // Opção desligada pelo admin enquanto a página está aberta: volta ao quadro.
  useEffect(() => {
    if (!calendarEnabled) router.replace("/app");
  }, [calendarEnabled, router]);

  useEffect(() => {
    void loadRange(from, to);
  }, [from, to, loadRange]);

  // Vários telemóveis na mesma oficina: ao voltar à app, refresca marcações e ordens (sem «a carregar»).
  const refresh = useCallback(() => {
    setToday(todayKey());
    setMinutesNow(currentMinutes());
    void loadRange(from, to, { silent: true });
    fetchOrders()
      .then(setOrders)
      .catch(() => {});
  }, [from, to, loadRange, setOrders]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(() => setMinutesNow(currentMinutes()), 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [refresh]);

  // Diálogos
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<{ day: string; time: string | null }>({ day: today, time: null });
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const openNew = (day: string, time: string | null) => {
    if (!canWrite) return;
    setAppointmentId(null);
    setPrefill({ day, time });
    setAppointmentOpen(true);
  };

  const openNewFromButton = () => {
    const day = view === "dia" ? anchor : days.includes(today) ? today : days[0];
    openNew(day, day === today ? nextHalfHour() : "09:00");
  };

  const openEvent = (event: CalendarEvent) => {
    if (event.source === "order") {
      setOrderId(event.refId);
      setOrderOpen(true);
    } else {
      setAppointmentId(event.refId);
      setAppointmentOpen(true);
    }
  };

  const step = view === "semana" ? 7 : 1;
  // Domingo só aparece na semana se tiver marcações.
  const gridDays = events.some((e) => e.day === days[6]) ? days : days.slice(0, 6);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Marcações"
        description="As chegadas previstas e os serviços marcados."
        actions={
          canWrite ? (
            <Button type="button" className="min-h-[44px] touch-manipulation" onClick={openNewFromButton}>
              <Plus className="h-4 w-4" />
              Nova marcação
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            onClick={() => setAnchor(addDays(anchor, -step))}
            aria-label={view === "semana" ? "Semana anterior" : "Dia anterior"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => setAnchor(today)}
            disabled={view === "semana" ? days.includes(today) : anchor === today}
          >
            Hoje
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            onClick={() => setAnchor(addDays(anchor, step))}
            aria-label={view === "semana" ? "Semana seguinte" : "Dia seguinte"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="ml-1 min-w-0 truncate text-sm font-medium first-letter:uppercase md:text-base" aria-live="polite">
            {view === "semana" ? formatWeekRange(anchor) : formatDayLong(anchor)}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
          <CalendarLegend />
          <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="Vista">
            {(["semana", "dia"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn(
                  "min-h-[40px] rounded-md px-4 text-sm font-medium transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {v === "semana" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-border p-6 text-center" role="alert">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => void loadRange(from, to)}>
            Tentar outra vez
          </Button>
        </div>
      ) : (
        <div className={cn("transition-opacity", isLoading && "opacity-60")} aria-busy={isLoading || undefined}>
          {view === "semana" ? (
            <WeekGrid
              days={gridDays}
              events={events}
              today={today}
              nowMinutes={minutesNow}
              canCreate={canWrite}
              onCreate={openNew}
              onOpen={openEvent}
            />
          ) : (
            <DayAgenda
              weekDays={days}
              selectedDay={anchor}
              today={today}
              events={events}
              canCreate={canWrite}
              onSelectDay={setAnchor}
              onCreate={openNew}
              onOpen={openEvent}
            />
          )}
        </div>
      )}

      <AppointmentDialog
        open={appointmentOpen}
        onOpenChange={setAppointmentOpen}
        appointmentId={appointmentId}
        initialDay={prefill.day}
        initialTime={prefill.time}
      />
      <OrderDialog open={orderOpen} onOpenChange={setOrderOpen} orderId={orderId} />
    </div>
  );
}
