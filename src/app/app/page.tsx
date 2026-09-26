"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/kanban/board";
import { OrderDialog } from "@/components/kanban/order-dialog";

export default function Home() {
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const handleNewOrder = () => {
    setEditingOrderId(null);
    setOrderDialogOpen(true);
  };

  const handleOrderClick = (orderId: string) => {
    setEditingOrderId(orderId);
    setOrderDialogOpen(true);
  };

  return (
    <>
      <KanbanBoard
        onNewOrder={handleNewOrder}
        onOrderClick={handleOrderClick}
      />
      <OrderDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        orderId={editingOrderId}
      />
    </>
  );
}
