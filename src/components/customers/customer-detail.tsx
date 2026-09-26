"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomerStore } from "@/stores/customer-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { useMounted } from "@/lib/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Pencil, Car } from "lucide-react";
import { CustomerDialog } from "./customer-dialog";
import { VehicleDialog } from "@/components/vehicles/vehicle-dialog";
import { cn } from "@/lib/utils";
import { mobileCard, pageStack } from "@/lib/layout";
import { useCanWrite } from "@/stores/workshop-store";

type CustomerDetailProps = {
  customerSlug: string;
};

export function CustomerDetail({ customerSlug }: CustomerDetailProps) {
  const router = useRouter();
  const mounted = useMounted();
  const customers = useCustomerStore((s) => s.customers);
  const customersLoading = useCustomerStore((s) => s.isLoading);
  const allVehicles = useVehicleStore((s) => s.vehicles);
  const canWrite = useCanWrite();

  const customer = useMemo(
    () => customers.find((c) => c.slug === customerSlug),
    [customers, customerSlug],
  );
  const vehicles = useMemo(
    () =>
      customer
        ? allVehicles.filter((v) => v.customerId === customer.id)
        : [],
    [allVehicles, customer],
  );
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  if (!mounted || customersLoading) {
    return (
      <div className={pageStack}>
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className={pageStack}>
        <Link
          href="/app/clientes"
          className="inline-flex min-h-[44px] w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos clientes
        </Link>
        <p className="text-muted-foreground">Cliente não encontrado.</p>
      </div>
    );
  }

  const handleNewVehicle = () => {
    setEditingVehicleId(null);
    setVehicleDialogOpen(true);
  };

  const handleEditVehicle = (id: string) => {
    setEditingVehicleId(id);
    setVehicleDialogOpen(true);
  };

  return (
    <div className={pageStack}>
      <Link
        href="/app/clientes"
        className="inline-flex min-h-[44px] w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos clientes
      </Link>

      <div
        className={cn(
          mobileCard,
          "flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
        )}
      >
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-xs text-muted-foreground">
            {customer.slug}
          </p>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            {customer.name}
          </h1>
          <p className="text-base text-muted-foreground">{customer.phone}</p>
          {customer.email && (
            <p className="text-muted-foreground">{customer.email}</p>
          )}
          {customer.notes && (
            <p className="mt-2 text-sm text-muted-foreground">
              {customer.notes}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setCustomerDialogOpen(true)}
          disabled={!canWrite}
          className="min-h-[44px] w-full shrink-0 touch-manipulation md:w-auto"
        >
          <Pencil className="h-4 w-4" />
          Editar dados
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground md:text-xl">
            <Car className="h-5 w-5" />
            Viaturas ({vehicles.length})
          </h2>
          <Button
            onClick={handleNewVehicle}
            disabled={!canWrite}
            className="min-h-[44px] w-full shrink-0 touch-manipulation sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Nova viatura
          </Button>
        </div>

        {vehicles.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            Este cliente ainda não tem viaturas registadas.
          </p>
        ) : (
          <ul className="flex flex-col gap-3 md:gap-2 md:rounded-xl md:border md:border-border md:bg-card md:divide-y md:divide-border md:overflow-hidden md:shadow-sm">
            {vehicles.map((v) => (
              <li key={v.id}>
                <div
                  className={cn(
                    mobileCard,
                    "flex items-center justify-between gap-4 md:rounded-none md:border-0 md:shadow-none md:px-4 md:py-3",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{v.plate}</p>
                    <p className="text-sm text-muted-foreground">
                      {v.make} {v.model} ({v.year})
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditVehicle(v.id)}
                    disabled={!canWrite}
                    aria-label="Editar viatura"
                    className="min-h-[44px] min-w-[44px] shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        customerId={customer.id}
        onDeleted={() => router.push("/app/clientes")}
      />
      <VehicleDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        vehicleId={editingVehicleId}
        defaultCustomerId={customer.id}
      />
    </div>
  );
}
