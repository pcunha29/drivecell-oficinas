"use client";

import type { OrderStatus } from "@/types";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

const COLUMN_LABELS: Record<OrderStatus, string> = {
  waiting: "Em espera",
  in_progress: "Em curso",
  done: "Concluída",
  delivered: "Entregue",
};

type KanbanColumnProps = {
  status: OrderStatus;
  children: React.ReactNode;
  count: number;
  className?: string;
};

export function KanbanColumn({
  status,
  children,
  count,
  className,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      data-status={status}
      className={cn(
        "flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-border bg-card p-3 shadow-sm transition-colors md:w-auto md:min-w-0 md:shrink",
        isOver && "border-primary ring-2 ring-primary/20",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground md:text-base">
          {COLUMN_LABELS[status]}
        </h3>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      <div className="flex max-h-[min(52vh,520px)] flex-col gap-3 overflow-y-auto overscroll-y-contain md:max-h-[min(58vh,640px)]">
        {children}
      </div>
    </div>
  );
}
