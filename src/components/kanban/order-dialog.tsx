"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useForm,
  useFieldArray,
  type UseFormRegister,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ServiceItem, OrderStatus } from "@/types";
import { useOrderStore } from "@/stores/order-store";
import { useCustomerStore } from "@/stores/customer-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { orderFormSchema, type OrderFormValues } from "@/lib/order-form-schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  DialogDeleteConfirm,
  DialogFormActions,
} from "@/components/ui/dialog-form-actions";
import { ReadOnlyDialogFooter } from "@/components/layout/read-only-dialog-footer";
import { useCanWrite, useTrackCosts } from "@/stores/workshop-store";

/**
 * Colunas das linhas de peças.
 * sm+: pega · descrição · qtd. · preço · (custo) · total · remover, numa linha.
 * Telemóvel: 1.ª linha pega · descrição · remover; 2.ª linha qtd. · preço · (custo), com rótulos.
 */
/** Números alinhados à direita e sem as setas do browser (que empurravam os valores). */
const NUMBER_INPUT =
  "text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Símbolo € dentro do campo, à direita: o cabeçalho fica numa linha e os valores alinham. */
function EuroSuffix() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
    >
      €
    </span>
  );
}

const ITEM_GRID =
  "grid gap-2 grid-cols-[28px_repeat(3,minmax(0,1fr))_40px] sm:grid-cols-[28px_minmax(0,1fr)_84px_108px_96px_40px]";
const ITEM_GRID_COST =
  "grid gap-2 grid-cols-[28px_repeat(3,minmax(0,1fr))_40px] sm:grid-cols-[28px_minmax(0,1fr)_72px_100px_100px_96px_40px]";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "waiting", label: "Em espera" },
  { value: "in_progress", label: "Em curso" },
  { value: "done", label: "Concluída" },
  { value: "delivered", label: "Entregue" },
];

type OrderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
};

export function OrderDialog({ open, onOpenChange, orderId }: OrderDialogProps) {
  const order = useOrderStore((s) =>
    orderId ? s.getOrderById(orderId) : undefined,
  );
  const addOrder = useOrderStore((s) => s.addOrder);
  const updateOrder = useOrderStore((s) => s.updateOrder);
  const deleteOrder = useOrderStore((s) => s.deleteOrder);
  const canWrite = useCanWrite();
  const trackCosts = useTrackCosts();
  const customers = useCustomerStore((s) => s.customers);
  const getVehiclesByCustomerId = useVehicleStore(
    (s) => s.getVehiclesByCustomerId,
  );

  const isEdit = !!orderId && !!order;

  const defaultValues: OrderFormValues = useMemo(
    () =>
      order
        ? {
            customerId: order.customerId,
            vehicleId: order.vehicleId,
            status: order.status,
            description: order.description,
            notes: order.notes ?? "",
            paid: order.paid,
            items:
              order.items.length > 0
                ? order.items.map((i) => ({
                    description: i.description,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    unitCost: i.unitCost ?? null,
                  }))
                : [{ description: "", quantity: 1, unitPrice: 0, unitCost: null }],
          }
        : {
            customerId: "",
            vehicleId: "",
            status: "waiting" as OrderStatus,
            description: "",
            notes: "",
            paid: false,
            items: [{ description: "", quantity: 1, unitPrice: 0, unitCost: null }],
          },
    [order],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues,
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "items",
  });

  const customerId = watch("customerId");
  const availableVehicles = useMemo(
    () => (customerId ? getVehiclesByCustomerId(customerId) : []),
    [customerId, getVehiclesByCustomerId],
  );

  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setSubmitError(null);
      setDeleteStep("idle");
    }
  }, [open, orderId, defaultValues, reset]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const handleCustomerChange = (newCustomerId: string) => {
    const avail = newCustomerId ? getVehiclesByCustomerId(newCustomerId) : [];
    setValue("vehicleId", avail[0]?.id ?? "");
  };

  const customerField = register("customerId");
  const paid = watch("paid") ?? false;
  const watchedItems = watch("items");
  const orderTotal = (watchedItems ?? []).reduce((sum, item) => {
    const line = Number(item?.quantity) * Number(item?.unitPrice);
    return Number.isFinite(line) ? sum + line : sum;
  }, 0);
  // Linhas sem custo (ex.: mão de obra) contam como custo zero.
  const orderCost = (watchedItems ?? []).reduce((sum, item) => {
    if (item?.unitCost === null || item?.unitCost === undefined || item?.unitCost === "") return sum;
    const line = Number(item?.quantity) * Number(item?.unitCost);
    return Number.isFinite(line) ? sum + line : sum;
  }, 0);
  const orderMargin = orderTotal - orderCost;
  const orderMarginPct = orderTotal > 0 ? (orderMargin / orderTotal) * 100 : null;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: OrderFormValues) => {
    if (!canWrite) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const rawItems = data.items ?? [];
      const orderItems: ServiceItem[] = rawItems
        .filter((i) => i.description.trim() !== "")
        .map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          // Com a opção desligada os custos já gravados mantêm-se (vêm nos valores do formulário).
          unitCost:
            i.unitCost === null || i.unitCost === undefined || i.unitCost === ""
              ? null
              : Number(i.unitCost),
        }));

      const payload = {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        status: data.status,
        description: data.description,
        notes: data.notes ?? "",
        paid: data.paid ?? false,
        items: orderItems,
      };

      if (isEdit && order) {
        await updateOrder(order.id, payload);
      } else {
        await addOrder(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Erro ao guardar ordem",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    append({ description: "", quantity: 1, unitPrice: 0, unitCost: null });
  };

  const removeItem = (index: number) => {
    remove(index);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleItemsDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex);
      }
    },
    [fields, move],
  );

  const handleDelete = async () => {
    if (!order || !canWrite) return;
    setSubmitError(null);
    setIsDeleting(true);
    try {
      await deleteOrder(order.id);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Erro ao eliminar a ordem",
      );
      setDeleteStep("confirm");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {!canWrite
              ? "Ordem de reparação"
              : isEdit
                ? "Editar ordem de reparação"
                : "Nova ordem de reparação"}
          </DialogTitle>
          {isEdit && order && deleteStep === "idle" && (
            <DialogDescription className="line-clamp-2">
              {order.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {deleteStep === "confirm" && order && canWrite ? (
          <DialogDeleteConfirm
            title="Eliminar esta ordem de reparação?"
            description={order.description}
            warning="Ação permanente: a ordem e todas as linhas são eliminadas."
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
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <Label htmlFor="customerId">Cliente</Label>
              <Select
                id="customerId"
                name={customerField.name}
                ref={customerField.ref}
                onBlur={customerField.onBlur}
                onChange={(e) => {
                  customerField.onChange(e);
                  handleCustomerChange(e.target.value);
                }}
              >
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

            <div className="grid content-start gap-2">
              <Label htmlFor="vehicleId">Viatura</Label>
              <Select id="vehicleId" {...register("vehicleId")}>
                <option value="">Escolher…</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.make} {v.model} ({v.year})
                  </option>
                ))}
              </Select>
              {errors.vehicleId && (
                <p className="text-sm text-red-600">
                  {errors.vehicleId.message}
                </p>
              )}
            </div>

            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição do serviço</Label>
              <Input
                id="description"
                placeholder="Ex.: Troca de pastilhas dianteiras"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <Select id="status" {...register("status")}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
              <div className="grid gap-0.5">
                <Label htmlFor="paid" className="cursor-pointer">
                  Serviço pago?
                </Label>
                <span className="text-xs text-muted-foreground">
                  {paid ? "Marcado como pago" : "Por pagar"}
                </span>
              </div>
              <Switch
                id="paid"
                checked={paid}
                onCheckedChange={(value) =>
                  setValue("paid", value, { shouldDirty: true })
                }
                aria-label="Serviço pago"
              />
            </div>

            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Peças e mão de obra</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-3 rounded-md border border-border p-3">
                <div className={cn(trackCosts ? ITEM_GRID_COST : ITEM_GRID, "items-center px-1 text-sm font-medium text-muted-foreground")}>
                  <span aria-hidden />
                  <span className="col-span-3 sm:col-span-1">Descrição</span>
                  <span className="hidden whitespace-nowrap text-right sm:block">Qtd.</span>
                  {trackCosts && (
                    <span className="hidden whitespace-nowrap text-right sm:block">Custo oficina</span>
                  )}
                  <span className="hidden whitespace-nowrap text-right sm:block">Preço cliente</span>
                  <span className="hidden text-right sm:block">Total</span>
                  <span aria-hidden />
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleItemsDragEnd}
                >
                  <SortableContext
                    items={fields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <ServiceItemRow
                          key={field.id}
                          id={field.id}
                          index={index}
                          defaultDescription={String(field.description ?? "")}
                          defaultQuantity={String(field.quantity ?? "")}
                          defaultUnitPrice={String(field.unitPrice ?? "")}
                          defaultUnitCost={field.unitCost == null ? "" : String(field.unitCost)}
                          register={register}
                          errors={errors}
                          trackCosts={trackCosts}
                          lineTotal={
                            Number(watchedItems?.[index]?.quantity) *
                            Number(watchedItems?.[index]?.unitPrice)
                          }
                          onRemove={() => removeItem(index)}
                          canRemove={fields.length > 1}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="border-t border-border px-1 pt-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Total da ordem</span>
                    <span className="text-lg font-semibold tabular-nums">{formatEuro(orderTotal)}</span>
                  </div>
                  {trackCosts && (
                    <dl className="m-0 mt-2 grid gap-1 text-sm">
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-muted-foreground">Custo das peças</dt>
                        <dd className="m-0 tabular-nums text-muted-foreground">{formatEuro(orderCost)}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-muted-foreground">Margem</dt>
                        <dd
                          className={cn(
                            "m-0 font-medium tabular-nums",
                            orderMargin < 0 ? "text-red-600 dark:text-red-400" : "text-foreground",
                          )}
                        >
                          {formatEuro(orderMargin)}
                          {orderMarginPct !== null && (
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              ({orderMarginPct.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}%)
                            </span>
                          )}
                        </dd>
                      </div>
                      <p className="m-0 text-xs text-muted-foreground">
                        Linhas sem custo (como a mão de obra) contam como custo zero.
                      </p>
                    </dl>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <textarea
                id="notes"
                rows={2}
                placeholder="Observações internas…"
                className="flex min-h-[64px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("notes")}
              />
            </div>

            </fieldset>

            {canWrite ? (
              <DialogFormActions
                onCancel={() => handleOpenChange(false)}
                submitLabel={isEdit ? "Guardar" : "Criar ordem"}
                isSubmitting={isSubmitting}
                error={submitError}
                deleteLabel={isEdit ? "Eliminar ordem" : undefined}
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
              <ReadOnlyDialogFooter onClose={() => handleOpenChange(false)} />
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

type ServiceItemRowProps = {
  id: string;
  index: number;
  defaultDescription: string;
  defaultQuantity: string;
  defaultUnitPrice: string;
  defaultUnitCost: string;
  register: UseFormRegister<OrderFormValues>;
  errors: FieldErrors<OrderFormValues>;
  onRemove: () => void;
  canRemove: boolean;
  lineTotal: number;
  trackCosts: boolean;
};

function ServiceItemRow({
  id,
  index,
  defaultDescription,
  defaultQuantity,
  defaultUnitPrice,
  defaultUnitCost,
  register,
  errors,
  onRemove,
  canRemove,
  lineTotal,
  trackCosts,
}: ServiceItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        trackCosts ? ITEM_GRID_COST : ITEM_GRID,
        "items-end",
        isDragging && "relative z-10 opacity-80",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="flex h-11 w-7 touch-none items-center justify-center self-end rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-grab active:cursor-grabbing"
        aria-label="Reordenar linha"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="col-span-3 space-y-1.5 sm:col-span-1">
        <Label htmlFor={`items.${index}.description`} className="sr-only">
          Descrição
        </Label>
        <Input
          id={`items.${index}.description`}
          placeholder="Ex.: Pastilhas dianteiras"
          defaultValue={defaultDescription}
          {...register(`items.${index}.description`)}
          className="min-w-0"
        />
        {errors.items?.[index]?.description && (
          <p className="text-xs text-red-600">
            {errors.items[index]?.description?.message}
          </p>
        )}
      </div>
      <div className="col-start-2 space-y-1 sm:col-start-auto sm:space-y-1.5">
        <Label
          htmlFor={`items.${index}.quantity`}
          className="text-xs font-normal text-muted-foreground whitespace-nowrap sm:sr-only"
        >
          <span aria-hidden className="sm:hidden">Qtd.</span>
          <span className="sr-only">Quantidade</span>
        </Label>
        <Input
          id={`items.${index}.quantity`}
          type="number"
          step="0.01"
          placeholder="1"
          defaultValue={defaultQuantity}
          {...register(`items.${index}.quantity`)}
          inputMode="decimal"
          className={NUMBER_INPUT}
        />
      </div>
      {trackCosts && (
        <div className="space-y-1 sm:space-y-1.5">
          <Label
            htmlFor={`items.${index}.unitCost`}
            className="text-xs font-normal text-muted-foreground whitespace-nowrap sm:sr-only"
          >
            <span aria-hidden className="sm:hidden">Custo</span>
            <span className="sr-only">Custo oficina</span>
          </Label>
          <div className="relative">
            <Input
              id={`items.${index}.unitCost`}
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0,00"
              defaultValue={defaultUnitCost}
              {...register(`items.${index}.unitCost`)}
              className={cn(NUMBER_INPUT, "pr-7 text-muted-foreground")}
            />
            <EuroSuffix />
          </div>
        </div>
      )}
      <div className="space-y-1 sm:space-y-1.5">
        <Label
          htmlFor={`items.${index}.unitPrice`}
          className="text-xs font-normal text-muted-foreground whitespace-nowrap sm:sr-only"
        >
          <span aria-hidden className="sm:hidden">Preço</span>
          <span className="sr-only">Preço cliente</span>
        </Label>
        <div className="relative">
          <Input
            id={`items.${index}.unitPrice`}
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={defaultUnitPrice}
            {...register(`items.${index}.unitPrice`)}
            className={cn(NUMBER_INPUT, "pr-7")}
          />
          <EuroSuffix />
        </div>
      </div>
      <span className="hidden h-11 items-center justify-end text-sm tabular-nums text-muted-foreground sm:flex">
        {Number.isFinite(lineTotal) ? formatEuro(lineTotal) : "—"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        className="col-start-5 row-start-1 self-end sm:col-start-auto sm:row-start-auto"
        aria-label="Remover linha"
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
