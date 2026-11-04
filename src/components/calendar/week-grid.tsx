"use client";

import { useMemo, type MouseEvent } from "react";
import {
  eventsByDay,
  formatDayLong,
  formatWeekdayShort,
  gridHours,
  layoutTimedEvents,
  minutesToTime,
  type CalendarEvent,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { EventChip } from "./event-chip";

/** Altura de uma hora na grelha (px). */
const HOUR_HEIGHT = 48;
/** Clicar num espaço vazio arredonda para a meia hora. */
const SLOT_MINUTES = 30;

type WeekGridProps = {
  days: string[];
  events: CalendarEvent[];
  today: string;
  /** Minutos desde a meia-noite (linha da hora atual no dia de hoje). */
  nowMinutes: number;
  canCreate: boolean;
  onCreate: (day: string, time: string | null) => void;
  onOpen: (event: CalendarEvent) => void;
};

export function WeekGrid({ days, events, today, nowMinutes, canCreate, onCreate, onOpen }: WeekGridProps) {
  const byDay = useMemo(() => eventsByDay(events), [events]);
  const { startHour, endHour } = useMemo(() => gridHours(events), [events]);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = hours.length * HOUR_HEIGHT;
  const hasUntimed = events.some((e) => !e.start);
  const columns = `3rem repeat(${days.length}, minmax(0, 1fr))`;

  const handleSlotClick = (day: string) => (e: MouseEvent<HTMLDivElement>) => {
    if (!canCreate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = ((e.clientY - rect.top) / HOUR_HEIGHT) * 60;
    const minutes = startHour * 60 + Math.floor(offset / SLOT_MINUTES) * SLOT_MINUTES;
    onCreate(day, minutesToTime(minutes));
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <div className="min-w-[640px]">
        {/* Cabeçalho dos dias */}
        <div className="grid border-b border-border bg-card" style={{ gridTemplateColumns: columns }}>
          <span aria-hidden />
          {days.map((day) => {
            const isToday = day === today;
            return (
              <div key={day} className="border-l border-border px-1 py-2 text-center" aria-label={formatDayLong(day)}>
                <span className="block text-xs uppercase tracking-wide text-muted-foreground">{formatWeekdayShort(day)}</span>
                <span
                  className={cn(
                    "mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
              </div>
            );
          })}
        </div>

        {/* Faixa «Sem hora» (ordens só com dia, marcações sem hora) */}
        {hasUntimed && (
          <div className="grid border-b border-border" style={{ gridTemplateColumns: columns }}>
            <span className="flex items-start justify-end px-1 py-1.5 text-[10px] leading-tight text-muted-foreground">
              Sem hora
            </span>
            {days.map((day) => (
              <div key={day} className="flex min-w-0 flex-col gap-1 border-l border-border p-1">
                {(byDay.get(day) ?? [])
                  .filter((e) => !e.start)
                  .map((event) => (
                    <EventChip key={event.key} event={event} variant="compact" onClick={() => onOpen(event)} />
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* Grelha horária */}
        <div className="grid" style={{ gridTemplateColumns: columns }}>
          <div className="relative" style={{ height: gridHeight }} aria-hidden>
            {hours.map((hour, i) => (
              <span
                key={hour}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {i === 0 ? "" : `${String(hour).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>

          {days.map((day) => {
            const positioned = layoutTimedEvents(byDay.get(day) ?? []);
            const isToday = day === today;
            const nowTop = ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT;
            return (
              <div
                key={day}
                className={cn("relative border-l border-border", canCreate && "cursor-pointer", isToday && "bg-primary/[0.03]")}
                style={{ height: gridHeight }}
                onClick={handleSlotClick(day)}
                title={canCreate ? "Toca num horário para criar uma marcação" : undefined}
              >
                {hours.map((hour, i) => (
                  <div key={hour} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: i * HOUR_HEIGHT }}>
                    <div className="border-t border-border" />
                    <div className="border-t border-dashed border-border/50" style={{ marginTop: HOUR_HEIGHT / 2 - 1 }} />
                  </div>
                ))}

                {isToday && nowTop >= 0 && nowTop <= gridHeight && (
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                    <div className="relative border-t-2 border-red-500">
                      <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}

                {positioned.map(({ event, start, end, column, columns: cols }) => {
                  const top = ((start - startHour * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT - 2, 20);
                  return (
                    <EventChip
                      key={event.key}
                      event={event}
                      variant="compact"
                      onClick={() => onOpen(event)}
                      className="absolute z-[5] shadow-sm"
                      style={{
                        top: top + 1,
                        height,
                        left: `calc(${(column / cols) * 100}% + 2px)`,
                        width: `calc(${100 / cols}% - 4px)`,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
