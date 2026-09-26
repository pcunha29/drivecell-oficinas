"use client";

import { useMemo, useState } from "react";
import { useVehicleStore } from "@/stores/vehicle-store";
import { useCustomerStore } from "@/stores/customer-store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { VehicleDialog } from "./vehicle-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { mobileCard, pageStack } from "@/lib/layout";
import { useCanWrite } from "@/stores/workshop-store";

export function VehicleTable() {
  const vehicles = useVehicleStore((s) => s.vehicles);
  const getCustomerById = useCustomerStore((s) => s.getCustomerById);
  const canWrite = useCanWrite();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return vehicles;
    const q = search.toLowerCase().trim();
    return vehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        getCustomerById(v.customerId)?.name.toLowerCase().includes(q),
    );
  }, [vehicles, search, getCustomerById]);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setDialogOpen(true);
  };

  const searchAndAdd = (
    <>
      <div className="relative w-full md:max-w-md">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <Input
          placeholder="Matrícula, marca, modelo ou cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn("w-full pl-9 min-h-[44px] text-base")}
        />
      </div>
      <Button
        onClick={handleNew}
        disabled={!canWrite}
        title={canWrite ? undefined : "Conta em só-leitura"}
        className="min-h-[44px] w-full shrink-0 touch-manipulation md:w-auto"
      >
        <Plus className="h-5 w-5" />
        Nova viatura
      </Button>
    </>
  );

  return (
    <div className={pageStack}>
      <PageHeader
        title="Viaturas"
        description="Todas as viaturas registadas na oficina"
        actions={searchAndAdd}
      />

      <ul className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            {vehicles.length === 0
              ? "Ainda não há viaturas. Toca em «Nova viatura»."
              : "Nenhum resultado."}
          </li>
        ) : (
          filtered.map((v) => {
            const customer = getCustomerById(v.customerId);
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => handleEdit(v.id)}
                  disabled={!canWrite}
                  className={cn(
                    mobileCard,
                    "flex w-full items-center justify-between gap-3 text-left",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{v.plate}</p>
                    <p className="text-sm text-muted-foreground">
                      {v.make} {v.model} · {v.year}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {customer?.name ?? "-"}
                    </p>
                  </div>
                  {canWrite && (
                    <Pencil className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matrícula</TableHead>
              <TableHead>Marca / Modelo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="w-[80px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {vehicles.length === 0
                    ? "Ainda não há viaturas."
                    : "Nenhum resultado para esta pesquisa."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => {
                const customer = getCustomerById(v.customerId);
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.plate}</TableCell>
                    <TableCell>
                      {v.make} {v.model}
                    </TableCell>
                    <TableCell>{v.year}</TableCell>
                    <TableCell>{customer?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(v.id)}
                        disabled={!canWrite}
                        aria-label="Editar"
                        className="min-h-[44px] min-w-[44px]"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <VehicleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicleId={editingId}
      />
    </div>
  );
}
