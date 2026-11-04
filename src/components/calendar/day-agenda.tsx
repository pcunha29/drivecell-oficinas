"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  eventsByDay,
  formatDayLong,
  formatWeekdayShort,
  type CalendarEvent,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { EventChip } from "./event-chip";

type DayAgendaProps = {
  /** Os 7 dias da semana do dia escolhido (faixa no topo). */
  weekDays: string[];
  selectedDay: string;
  today: string;
  events: CalendarEvent[];
  canCreate: boolean;
  onSelectDay: (day: string) => void;
  onCreate: (day: string, time: string | null) => void;
  onOpen: (event: CalendarEvent) => void;
};

/** Vista Dia: faixa da semana + lista do dia (sem hora primeiro, depois por hora). */
export function DayAgenda({ weekDays, selectedDay, today, events, canCreate, onSelectDay, onCreate, onOpen }: DayAgendaProps) {
  const byDay = eventsByDay(events);
  const dayEvents = byDay.get(selectedDay) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1 rounded-lg border border-border bg-card p-1" role="group" aria-label="Dias da semana">
        {weekDays.map((day) => {
          const isSelected = day === selectedDay;
          const isToday = day === today;
          const count = byDay.get(day)?.length ?? 0;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={isSelected}
              aria-label={`${formatDayLong(day)}${count > 0 ? `, ${count} ${count === 1 ? "marcação" : "marcações"}` : ""}`}
              className={cn(
                "flex min-h-[56px] touch-manipulation flex-col items-center justify-center gap-0.5 rounded-md text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <span className={cn("uppercase", !isSelected && "text-muted-foreground")}>{formatWeekdayShort(day).replace(".", "")}</span>
              <span className={cn("text-base font-semibold tabular-nums", isToday && !isSelected && "text-primary underline underline-offset-4")}>
                {Number(day.slice(8))}
              </span>
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  count > 0 ? (isSelected ? "bg-primary-foreground" : "bg-primary") : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      <h2 className="text-base font-semibold first-letter:uppercase">
        {formatDayLong(selectedDay)}
        {selectedDay === today && <span className="ml-2 text-sm font-normal text-muted-foreground">Hoje</span>}
      </h2>

      {dayEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">Sem marcações neste dia.</p>
          {canCreate && (
            <Button type="button" variant="outline" className="mt-4 min-h-[44px]" onClick={() => onCreate(selectedDay, null)}>
              <Plus className="h-4 w-4" />
              Nova marcação
            </Button>
          )}
        </div>
      ) : (
        <ol className="space-y-2">
          {dayEvents.map((event) => (
            <li key={event.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3">
              <span className="pt-2.5 text-sm tabular-nums text-muted-foreground">
                {event.start ? (
                  <>
                    {event.start}
                    {event.end && <span className="block text-xs">até {event.end}</span>}
                  </>
                ) : (
                  <span className="text-xs">Sem hora</span>
                )}
              </span>
              <EventChip event={event} variant="row" onClick={() => onOpen(event)} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
