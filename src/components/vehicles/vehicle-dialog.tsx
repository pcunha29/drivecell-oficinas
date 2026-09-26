"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useVehicleStore } from "@/stores/vehicle-store";
import { useCustomerStore } from "@/stores/customer-store";
import { useOrderStore } from "@/stores/order-store";
import { vehicleFormSchema, type VehicleFormValues } from "@/lib/vehicle-form-schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DialogDeleteConfirm,
  DialogFormActions,
} from "@/components/ui/dialog-form-actions";
import { ReadOnlyDialogFooter } from "@/components/layout/read-only-dialog-footer";
import { useCanWrite } from "@/stores/workshop-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type VehicleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string | null;
  defaultCustomerId?: string | null;
};

function parseDeleteError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (
    message.includes("foreign key") ||
    message.includes("violates foreign key") ||
    message.includes("restrict")
  ) {
    return "Não é possível eliminar: existem ordens de reparação associadas a esta viatura.";
  }
  return message || "Erro ao eliminar viatura.";
}

export function VehicleDialog({
  open,
  onOpenChange,
  vehicleId,
  defaultCustomerId,
}: VehicleDialogProps) {
  const vehicle = useVehicleStore((s) =>
    vehicleId ? s.getVehicleById(vehicleId) : undefined,
  );
  const addVehicle = useVehicleStore((s) => s.addVehicle);
  const updateVehicle = useVehicleStore((s) => s.updateVehicle);
  const removeVehicle = useVehicleStore((s) => s.removeVehicle);
  const canWrite = useCanWrite();
  const customers = useCustomerStore((s) => s.customers);
  const orders = useOrderStore((s) => s.orders);

  const isEdit = !!vehicleId && !!vehicle;

  const orderCount = useMemo(
    () =>
      vehicle ? orders.filter((o) => o.vehicleId === vehicle.id).length : 0,
    [orders, vehicle],
  );

  const defaultValues: VehicleFormValues = useMemo(
    () =>
      vehicle
        ? {
            customerId: vehicle.customerId,
            plate: vehicle.plate,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
          }
        : {
            customerId: defaultCustomerId ?? "",
            plate: "",
            make: "",
            model: "",
            year: new Date().getFullYear(),
          },
    [vehicle, defaultCustomerId],
  );

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setSubmitError(null);
      setDeleteStep("idle");
    }
  }, [open, vehicleId, defaultValues, reset]);

  const onSubmit = async (data: VehicleFormValues) => {
    if (!canWrite) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        customerId: data.customerId,
        plate: data.plate,
        make: data.make,
        model: data.model,
        year: Number(data.year),
      };
      if (isEdit && vehicle) {
        await updateVehicle(vehicle.id, payload);
      } else {
        await addVehicle(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Erro ao guardar viatura",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canWrite || !vehicle) return;
    setSubmitError(null);
    setIsDeleting(true);
    try {
      await removeVehicle(vehicle.id);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(parseDeleteError(err));
      setDeleteStep("confirm");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {!canWrite ? "Viatura" : isEdit ? "Editar viatura" : "Nova viatura"}
          </DialogTitle>
        </DialogHeader>

        {deleteStep === "confirm" && canWrite && vehicle ? (
          <DialogDeleteConfirm
            title={`Eliminar ${vehicle.plate}?`}
            description={`${vehicle.make} ${vehicle.model}`}
            warning={[
              "Ação permanente.",
              orderCount > 0
                ? `Serão eliminadas ${orderCount} ${orderCount === 1 ? "ordem" : "ordens"} de serviço associadas.`
                : null,
            ]
              .filter(Boolean)
              .join(" ")}
            error={submitError}
            isDeleting={isDeleting}
            onBack={() => {
              setDeleteStep("idle");
              setSubmitError(null);
            }}
            onConfirm={() => void handleDelete()}
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <fieldset
              disabled={!canWrite}
              className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0"
            >
            <div className="grid gap-2">
              <Label htmlFor="customerId">Cliente</Label>
              <Select id="customerId" {...register("customerId")}>
                <option value="">Escolher…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {errors.customerId && (
                <p className="text-sm text-red-600">
                  {errors.customerId.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plate">Matrícula</Label>
              <Input
                id="plate"
                placeholder="12-AB-34"
                {...register("plate")}
              />
              {errors.plate && (
                <p className="text-sm text-red-600">{errors.plate.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="make">Marca</Label>
                <Input id="make" placeholder="Ex.: Renault" {...register("make")} />
                {errors.make && (
                  <p className="text-sm text-red-600">{errors.make.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">Modelo</Label>
                <Input id="model" placeholder="Ex.: Clio" {...register("model")} />
                {errors.model && (
                  <p className="text-sm text-red-600">{errors.model.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="year">Ano</Label>
              <Input id="year" type="number" {...register("year")} />
              {errors.year && (
                <p className="text-sm text-red-600">{errors.year.message}</p>
              )}
            </div>
            </fieldset>

            {canWrite ? (
              <DialogFormActions
                onCancel={() => onOpenChange(false)}
                submitLabel={isEdit ? "Guardar" : "Criar"}
                isSubmitting={isSubmitting}
                error={submitError}
                deleteLabel={isEdit ? "Eliminar viatura" : undefined}
                onDelete={
                  isEdit
                    ? () => {
                        setSubmitError(null);
                        setDeleteStep("confirm");
                      }
                    : undefined
                }
              />
            ) : (
              <ReadOnlyDialogFooter onClose={() => onOpenChange(false)} />
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
