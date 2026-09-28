"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCustomerStore } from "@/stores/customer-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { useOrderStore } from "@/stores/order-store";
import {
  customerFormSchema,
  type CustomerFormValues,
} from "@/lib/customer-form-schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DialogDeleteConfirm,
  DialogFormActions,
} from "@/components/ui/dialog-form-actions";
import { ReadOnlyDialogFooter } from "@/components/layout/read-only-dialog-footer";
import { useCanWrite } from "@/stores/workshop-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  onDeleted?: () => void;
};

function parseDeleteError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (
    message.includes("foreign key") ||
    message.includes("violates foreign key") ||
    message.includes("restrict")
  ) {
    return "Não é possível eliminar: existem ordens de reparação associadas a este cliente.";
  }
  return message || "Erro ao eliminar cliente.";
}

export function CustomerDialog({
  open,
  onOpenChange,
  customerId,
  onDeleted,
}: CustomerDialogProps) {
  const customers = useCustomerStore((s) => s.customers);
  const customer = useMemo(
    () => (customerId ? customers.find((c) => c.id === customerId) : undefined),
    [customers, customerId],
  );
  const addCustomer = useCustomerStore((s) => s.addCustomer);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);
  const removeCustomer = useCustomerStore((s) => s.removeCustomer);
  const canWrite = useCanWrite();
  const vehicles = useVehicleStore((s) => s.vehicles);
  const orders = useOrderStore((s) => s.orders);

  const isEdit = !!customerId && !!customer;

  const orderCount = useMemo(
    () =>
      customer ? orders.filter((o) => o.customerId === customer.id).length : 0,
    [orders, customer],
  );

  const vehicleCount = useMemo(
    () =>
      customer
        ? vehicles.filter((v) => v.customerId === customer.id).length
        : 0,
    [vehicles, customer],
  );

  const defaultValues: CustomerFormValues = useMemo(
    () =>
      customer
        ? {
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            notes: customer.notes,
          }
        : {
            name: "",
            phone: "",
            email: "",
            notes: "",
          },
    [customer],
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
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setSubmitError(null);
      setDeleteStep("idle");
    }
  }, [open, customerId, defaultValues, reset]);

  const onSubmit = async (data: CustomerFormValues) => {
    if (!canWrite) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const parsed = customerFormSchema.parse(data);
      if (isEdit && customer) {
        await updateCustomer(customer.id, parsed);
      } else {
        await addCustomer({
          name: parsed.name,
          phone: parsed.phone,
          email: parsed.email ?? "",
          notes: parsed.notes ?? "",
        });
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Erro ao guardar cliente",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canWrite || !customer) return;
    setSubmitError(null);
    setIsDeleting(true);
    try {
      await removeCustomer(customer.id);
      onOpenChange(false);
      onDeleted?.();
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
            {!canWrite ? "Cliente" : isEdit ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
          {isEdit && customer && deleteStep === "idle" && (
            <DialogDescription>
              {customer.slug} - {customer.name}
            </DialogDescription>
          )}
        </DialogHeader>

        {deleteStep === "confirm" && canWrite && customer ? (
          <DialogDeleteConfirm
            title={`Eliminar ${customer.name}?`}
            warning={[
              "Ação permanente.",
              orderCount > 0 || vehicleCount > 0
                ? `Serão eliminadas: ${[
                    orderCount > 0
                      ? `${orderCount} ${orderCount === 1 ? "ordem" : "ordens"}`
                      : null,
                    vehicleCount > 0
                      ? `${vehicleCount} ${vehicleCount === 1 ? "viatura" : "viaturas"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}.`
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
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <fieldset
              disabled={!canWrite}
              className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0"
            >
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="912 345 678"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Input id="notes" placeholder="Opcional" {...register("notes")} />
            </div>
            </fieldset>

            {canWrite ? (
              <DialogFormActions
                onCancel={() => onOpenChange(false)}
                submitLabel={isEdit ? "Guardar" : "Criar"}
                isSubmitting={isSubmitting}
                error={submitError}
                deleteLabel={isEdit ? "Eliminar cliente" : undefined}
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
