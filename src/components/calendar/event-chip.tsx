"use client";

import type { CSSProperties } from "react";
import { CalendarClock, Wrench } from "lucide-react";
import { formatTimeRange, isMuted, type CalendarEvent } from "@/lib/calendar";
import { cn } from "@/lib/utils";

const SOURCE_STYLE = {
  order: "bg-event-order-bg border-event-order",
  manual: "bg-event-manual-bg border-event-manual",
} as const;

const SOURCE_ICON_STYLE = {
  order: "text-event-order",
  manual: "text-event-manual",
} as const;

/** Etiqueta de estado (texto, para a cor não ser o único sinal). */
export function eventStatusLabel(event: CalendarEvent): string | null {
  if (event.source === "order") return event.arrived ? "Já entrou" : null;
  if (event.status === "canceled") return "Cancelada";
  if (event.status === "no_show") return "Faltou";
  return null;
}

/** "Ordem de reparação: 09:30, AA-12-BC, Troca de pastilhas, Ana Silva" (leitores de ecrã). */
export function eventAriaLabel(event: CalendarEvent): string {
  const kind = event.source === "order" ? "Ordem de reparação" : "Marcação";
  const parts = [formatTimeRange(event.start, event.end), event.plate, event.title, event.customerName, eventStatusLabel(event)];
  return `${kind}: ${parts.filter(Boolean).join(", ")}`;
}

function EventIcon({ event, className }: { event: CalendarEvent; className?: string }) {
  const Icon = event.source === "order" ? Wrench : CalendarClock;
  return <Icon className={cn("size-3.5 shrink-0", SOURCE_ICON_STYLE[event.source], className)} aria-hidden />;
}

type EventChipProps = {
  event: CalendarEvent;
  onClick: () => void;
  /** Grelha horária: posição absoluta e altura dada pela duração. */
  style?: CSSProperties;
  /** compact = bloco da grelha; row = linha da lista do dia. */
  variant: "compact" | "row";
  className?: string;
};

export function EventChip({ event, onClick, style, variant, className }: EventChipProps) {
  const muted = isMuted(event);
  const status = eventStatusLabel(event);
  const struck = event.status === "canceled";
  // Ordens: a matrícula identifica o carro. Marcações: o tipo de serviço.
  const heading = event.source === "order" ? event.plate || event.title : event.title;
  const detail =
    event.source === "order"
      ? [event.plate ? event.title : null, event.customerName].filter(Boolean).join(" · ")
      : [event.customerName, event.plate].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={style}
      aria-label={eventAriaLabel(event)}
      className={cn(
        "group flex min-w-0 touch-manipulation flex-col overflow-hidden rounded-md border-l-[3px] text-left text-foreground transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:brightness-125",
        SOURCE_STYLE[event.source],
        muted && "opacity-60",
        variant === "compact" ? "gap-0 px-1.5 py-1 text-[11px] leading-tight" : "w-full gap-0.5 px-3 py-2.5 text-sm",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-1">
        <EventIcon event={event} />
        {variant === "compact" && event.start && (
          <span className="shrink-0 tabular-nums text-muted-foreground">{formatTimeRange(event.start, event.end)}</span>
        )}
        <span className={cn("truncate font-semibold", struck && "line-through")}>{heading}</span>
      </span>
      {detail && (
        <span className={cn("truncate text-muted-foreground", variant === "compact" ? "pl-[18px]" : "pl-[18px] text-[13px]")}>
          {detail}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "pl-[18px] font-medium uppercase tracking-wide text-muted-foreground",
            variant === "compact" ? "text-[9px]" : "text-[11px]",
          )}
        >
          {status}
        </span>
      )}
    </button>
  );
}

/** Legenda das duas cores (com o ícone de cada tipo). */
export function CalendarLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)} aria-label="Legenda">
      <li className="flex items-center gap-1.5">
        <span className="inline-flex size-4 items-center justify-center rounded-sm border-l-[3px] border-event-order bg-event-order-bg">
          <Wrench className="size-2.5 text-event-order" aria-hidden />
        </span>
        Ordens de reparação
      </li>
      <li className="flex items-center gap-1.5">
        <span className="inline-flex size-4 items-center justify-center rounded-sm border-l-[3px] border-event-manual bg-event-manual-bg">
          <CalendarClock className="size-2.5 text-event-manual" aria-hidden />
        </span>
        Marcações
      </li>
    </ul>
  );
}
