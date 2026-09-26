"use client";

import type { ServiceOrder } from "@/types";
import { useVehicleStore } from "@/stores/vehicle-store";
import { useCustomerStore } from "@/stores/customer-store";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import { usePreferencesStore } from "@/stores/preferences-store";
import { CheckCircle2, GripVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCanWrite } from "@/stores/workshop-store";

type OrderCardProps = {
  order: ServiceOrder;
  onClick?: () => void;
  onEdit?: () => void;
};

/** Versão só visual do cartão para o DragOverlay (fica por cima de tudo). */
const PRICES_HIDDEN = "••••";

export function OrderCardPreview({ order }: { order: ServiceOrder }) {
  const getVehicle = useVehicleStore((s) => s.getVehicleById);
  const getCustomer = useCustomerStore((s) => s.getCustomerById);
  const pricesVisible = usePreferencesStore((s) => s.pricesVisible);
  const vehicle = getVehicle(order.vehicleId);
  const customer = getCustomer(order.customerId);
  const itemCount = order.items.length;
  const total = order.items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0,
  );

  return (
    <Card className="cursor-grabbing shadow-lg ring-2 ring-primary rotate-2 w-[280px]">
      <CardHeader className="flex flex-row items-start gap-2 space-y-0 p-3">
        <div className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground touch-none">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {customer?.name ?? "-"}
          </p>
          <p className="text-xs text-muted-foreground">
            {vehicle
              ? `${vehicle.plate} · ${vehicle.make} ${vehicle.model}`
              : "-"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {order.description || "Sem descrição"}
        </p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant={order.status} className="text-xs shrink-0">
            {order.status === "waiting" && "Em espera"}
            {order.status === "in_progress" && "Em curso"}
            {order.status === "done" && "Concluída"}
            {order.status === "delivered" && "Entregue"}
          </Badge>
          {order.paid && <PaidBadge />}
          <span className="text-sm text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "itens"}
          </span>
          <span className="text-sm font-medium ml-auto tabular-nums">
            {pricesVisible ? formatEuro(total) : PRICES_HIDDEN}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function PaidBadge() {
  return (
    <Badge
      variant="done"
      className="text-xs shrink-0 gap-1"
      title="Serviço pago"
    >
      <CheckCircle2 className="h-3 w-3" />
      Pago
    </Badge>
  );
}

export function OrderCard({ order, onClick, onEdit }: OrderCardProps) {
  const getVehicle = useVehicleStore((s) => s.getVehicleById);
  const getCustomer = useCustomerStore((s) => s.getCustomerById);
  const pricesVisible = usePreferencesStore((s) => s.pricesVisible);
  const vehicle = getVehicle(order.vehicleId);
  const customer = getCustomer(order.customerId);
  const canWrite = useCanWrite();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: order.id,
      data: { order },
      disabled: !canWrite,
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const itemCount = order.items.length;
  const total = order.items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0,
  );

  return (
    <Card
      ref={setNodeRef}
      data-order-id={order.id}
      style={style}
      className={cn(
        "shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-40 shadow-lg ring-2 ring-primary",
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start gap-2 space-y-0 p-3">
        {canWrite && (
          <button
            type="button"
            className="touch-none touch-manipulation p-1 -m-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
            {...attributes}
            {...listeners}
            aria-label="Arrastar"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {customer?.name ?? "-"}
          </p>
          <p className="text-xs text-muted-foreground">
            {vehicle
              ? `${vehicle.plate} · ${vehicle.make} ${vehicle.model}`
              : "-"}
          </p>
        </div>
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px] shrink-0"
            aria-label="Editar ordem de reparação"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {order.description || "Sem descrição"}
        </p>
        {order.notes?.trim() && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            Nota: {order.notes}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant={order.status} className="text-xs shrink-0">
            {order.status === "waiting" && "Em espera"}
            {order.status === "in_progress" && "Em curso"}
            {order.status === "done" && "Concluída"}
            {order.status === "delivered" && "Entregue"}
          </Badge>
          {order.paid && <PaidBadge />}
          <span className="text-sm text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "itens"}
          </span>
          <span className="text-sm font-medium ml-auto tabular-nums">
            {pricesVisible ? formatEuro(total) : PRICES_HIDDEN}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
