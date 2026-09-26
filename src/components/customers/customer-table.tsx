"use client";

import { useMemo, useState } from "react";
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
import Link from "next/link";
import { Plus, Pencil, Search, Car, ChevronRight } from "lucide-react";
import { useVehicleStore } from "@/stores/vehicle-store";
import { cn } from "@/lib/utils";
import { CustomerDialog } from "./customer-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { mobileCard, pageStack } from "@/lib/layout";
import { useCanWrite } from "@/stores/workshop-store";

export function CustomerTable() {
  const customers = useCustomerStore((s) => s.customers);
  const canWrite = useCanWrite();
  const getVehiclesByCustomerId = useVehicleStore(
    (s) => s.getVehiclesByCustomerId,
  );
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const handleNew = () => {
    setEditingId(null);
    setDialogOpen(true);
  };

  const searchAndAdd = (
    <>
      <div className="relative w-full md:max-w-sm">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <Input
          placeholder="Procurar cliente…"
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
        Novo cliente
      </Button>
    </>
  );

  return (
    <div className={pageStack}>
      <PageHeader
        title="Clientes"
        description="Gerir clientes e viaturas da oficina"
        actions={searchAndAdd}
      />

      {/* Mobile: cartões */}
      <ul className="flex flex-col gap-3 md:hidden">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            {customers.length === 0
              ? "Ainda não há clientes. Toca em «Novo cliente»."
              : "Nenhum resultado."}
          </li>
        ) : (
          filtered.map((c) => {
            const vehicleCount = getVehiclesByCustomerId(c.id).length;
            return (
              <li key={c.id}>
                <Link
                  href={`/app/clientes/${c.slug}`}
                  className={cn(mobileCard, "flex items-center gap-3")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted-foreground">
                      {c.slug}
                    </p>
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.phone}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {vehicleCount}{" "}
                      {vehicleCount === 1 ? "viatura" : "viaturas"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })
        )}
      </ul>

      {/* Tablet+: tabela */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead>Viaturas</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {customers.length === 0
                    ? "Ainda não há clientes."
                    : "Nenhum resultado para esta pesquisa."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const vehicleCount = getVehiclesByCustomerId(c.id).length;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.slug}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/app/clientes/${c.slug}`}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {c.email || "-"}
                    </TableCell>
                    <TableCell>{vehicleCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="min-h-[44px] min-w-[44px]"
                          title="Ver viaturas"
                        >
                          <Link
                            href={`/app/clientes/${c.slug}`}
                            aria-label="Ver viaturas"
                          >
                            <Car className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(c.id);
                            setDialogOpen(true);
                          }}
                          disabled={!canWrite}
                          aria-label="Editar dados"
                          className="min-h-[44px] min-w-[44px]"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customerId={editingId}
      />
    </div>
  );
}
