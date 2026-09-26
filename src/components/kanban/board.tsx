"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { OrderStatus } from "@/types";
import { useOrderStore } from "@/stores/order-store";
import { KanbanColumn } from "./column";
import { OrderCard, OrderCardPreview } from "./order-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { PricesVisibilityToggle } from "@/components/dashboard/prices-visibility-toggle";
import { pageStack } from "@/lib/layout";
import { useCanWrite } from "@/stores/workshop-store";

const STATUSES: OrderStatus[] = [
  "waiting",
  "in_progress",
  "done",
  "delivered",
];

type KanbanBoardProps = {
  onNewOrder?: () => void;
  onOrderClick?: (orderId: string) => void;
};

export function KanbanBoard({
  onNewOrder,
  onOrderClick,
}: KanbanBoardProps) {
  const getOrdersByStatus = useOrderStore((s) => s.getOrdersByStatus);
  const getOrderById = useOrderStore((s) => s.getOrderById);
  const moveOrder = useOrderStore((s) => s.moveOrder);
  const canWrite = useCanWrite();
  useOrderStore((s) => s.orders);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!canWrite || !over || active.id === over.id) return;
      const newStatus = over.id as OrderStatus;
      if (STATUSES.includes(newStatus)) {
        void moveOrder(String(active.id), newStatus).catch(console.error);
      }
    },
    [moveOrder, canWrite],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
  );

  return (
    <div className={cn(pageStack)}>
      <DashboardStats />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground md:text-xl">
            Quadro de ordens
          </h2>
          <div className="flex items-center gap-2">
            <PricesVisibilityToggle />
            <Button
              onClick={onNewOrder}
              disabled={!canWrite}
              title={canWrite ? undefined : "Conta em só-leitura"}
              className="min-h-[44px] flex-1 sm:flex-initial touch-manipulation"
            >
              <Plus className="h-5 w-5" />
              Nova ordem
            </Button>
          </div>
        </div>
        <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          {/* Mobile: scroll horizontal | Tablet+: grelha 2x2 ou 4 colunas */}
          <div
            className={cn(
              "kanban-scroll flex gap-3 pb-2 -mx-4 px-4",
              "md:mx-0 md:px-0 md:pb-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible",
              "lg:grid-cols-4 xl:gap-6",
            )}
          >
            {STATUSES.map((status) => {
              const columnOrders = getOrdersByStatus(status);
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  count={columnOrders.length}
                >
                  {columnOrders.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma ordem
                    </p>
                  ) : (
                    columnOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onClick={() => onOrderClick?.(order.id)}
                        onEdit={
                          canWrite ? () => onOrderClick?.(order.id) : undefined
                        }
                      />
                    ))
                  )}
                </KanbanColumn>
              );
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeId && (() => {
              const order = getOrderById(activeId);
              return order ? <OrderCardPreview order={order} /> : null;
            })()}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
