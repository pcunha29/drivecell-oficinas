"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DialogDeleteConfirm, DialogFormActions } from "@/components/ui/dialog-form-actions";
import { ReadOnlyDialogFooter } from "@/components/layout/read-only-dialog-footer";
import {
  APPOINTMENT_LIMITS,
  SERVICE_TYPE_SUGGESTIONS,
  appointmentFormSchema,
  type AppointmentFormOutput,
  type AppointmentFormValues,
} from "@/lib/appointment-form-schema";
import { formatDayLong, isValidDay, minutesToTime, timeToMinutes } from "@/lib/calendar";
import { useAppointmentStore } from "@/stores/appointment-store";
import { useCustomerStore } from "@/stores/customer-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { useCanWrite } from "@/stores/workshop-store";
import type { AppointmentInput } from "@/types";

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Marcada" },
  { value: "canceled", label: "Cancelada" },
  { value: "no_show", label: "Faltou" },
] as const;

const errorText = "text-sm text-red-600 dark:text-red-400";

/** Mensagem em português para erros da base de dados (nunca o texto técnico). */
function saveErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : "";
  if (code === "42501" || message === "not_found") {
    return "Não foi possível guardar: a marcação já não existe ou a conta está em só-leitura.";
  }
  if (code === "23514") return "Há dados inválidos. Revê os campos e tenta outra vez.";
  if (code === "23503") return "O cliente ou a viatura escolhidos já não existem. Escreve o nome à mão.";
  return "Não foi possível guardar a marcação. Tenta outra vez.";
}

type AppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = nova marcação. */
  appointmentId: string | null;
  /** Nova marcação: dia e hora pré-preenchidos (ex.: espaço tocado na grelha). */
  initialDay: string;
  initialTime: string | null;
};

export function AppointmentDialog({ open, onOpenChange, appointmentId, initialDay, initialTime }: AppointmentDialogProps) {
  const appointment = useAppointmentStore((s) =>
    appointmentId ? s.appointments.find((a) => a.id === appointmentId) : undefined,
  );
  // A lista em si (referência estável); os tipos calculam-se no useMemo abaixo. Um .map() aqui
  // devolvia um array novo a cada leitura e o Zustand re-renderizava sem fim (React #185).
  const loadedAppointments = useAppointmentStore((s) => s.appointments);
  const addAppointment = useAppointmentStore((s) => s.addAppointment);
  const updateAppointment = useAppointmentStore((s) => s.updateAppointment);
  const deleteAppointment = useAppointmentStore((s) => s.deleteAppointment);
  const customers = useCustomerStore((s) => s.customers);
  const vehicles = useVehicleStore((s) => s.vehicles);
  const canWrite = useCanWrite();
  const isEdit = !!appointment;

  const defaultValues: AppointmentFormValues = useMemo(
    () =>
      appointment
        ? {
            serviceType: appointment.serviceType,
            customerName: appointment.customerName,
            customerId: appointment.customerId ?? "",
            vehicleId: appointment.vehicleId ?? "",
            phone: appointment.phone,
            plate: appointment.plate,
            day: appointment.day,
            startTime: appointment.startTime ?? "",
            endTime: appointment.endTime ?? "",
            status: appointment.status,
            notes: appointment.notes,
          }
        : {
            serviceType: "",
            customerName: "",
            customerId: "",
            vehicleId: "",
            phone: "",
            plate: "",
            day: initialDay,
            startTime: initialTime ?? "",
            endTime: "",
            status: "scheduled",
            notes: "",
          },
    [appointment, initialDay, initialTime],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues, unknown, AppointmentFormOutput>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues,
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setSubmitError(null);
      setDeleteStep("idle");
    }
  }, [open, defaultValues, reset]);

  const customerId = watch("customerId");
  const startTime = watch("startTime");
  const day = watch("day");
  const customerVehicles = useMemo(
    () => (customerId ? vehicles.filter((v) => v.customerId === customerId) : []),
    [customerId, vehicles],
  );
  const serviceTypes = useMemo(
    () =>
      Array.from(new Set([...SERVICE_TYPE_SUGGESTIONS, ...loadedAppointments.map((a) => a.serviceType)])).sort((a, b) =>
        a.localeCompare(b, "pt"),
      ),
    [loadedAppointments],
  );

  // Cliente: texto livre; se coincidir com um cliente da lista, fica ligado e sugere telefone e matrícula.
  const customerField = register("customerName");
  const handleCustomerInput = (name: string) => {
    const matches = customers.filter((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    const match = matches.length === 1 ? matches[0] : undefined;
    if (!match) {
      if (getValues("customerId")) {
        setValue("customerId", "");
        setValue("vehicleId", "");
      }
      return;
    }
    if (match.id === getValues("customerId")) return;
    setValue("customerId", match.id);
    if (!getValues("phone")) setValue("phone", match.phone);
    const own = vehicles.filter((v) => v.customerId === match.id);
    if (own.length === 1 && !getValues("plate")) {
      setValue("plate", own[0].plate);
      setValue("vehicleId", own[0].id);
    } else {
      setValue("vehicleId", "");
    }
  };

  const plateField = register("plate");
  const handlePlateInput = (plate: string) => {
    const match = customerVehicles.find((v) => v.plate.toUpperCase() === plate.trim().toUpperCase());
    setValue("vehicleId", match?.id ?? "");
  };

  // Ao mudar o início de um intervalo, o fim acompanha (mantém a duração).
  const startField = register("startTime");
  const handleStartChange = (next: string) => {
    // Ainda é o valor anterior: o onChange do campo corre depois.
    const prevStart = String(getValues("startTime") ?? "");
    const end = getValues("endTime");
    if (!next) {
      setValue("endTime", "");
      return;
    }
    if (end && prevStart && /^\d{2}:\d{2}$/.test(prevStart)) {
      const duration = timeToMinutes(String(end)) - timeToMinutes(prevStart);
      if (duration > 0) setValue("endTime", minutesToTime(timeToMinutes(next) + duration));
    }
  };

  const onSubmit = async (data: AppointmentFormOutput) => {
    if (!canWrite) return;
    setSubmitError(null);
    const input: AppointmentInput = {
      serviceType: data.serviceType,
      customerName: data.customerName,
      customerId: data.customerId || null,
      vehicleId: data.vehicleId || null,
      phone: data.phone,
      plate: data.plate,
      day: data.day,
      startTime: data.startTime || null,
      endTime: data.startTime && data.endTime ? data.endTime : null,
      status: isEdit ? data.status : "scheduled",
      notes: data.notes,
    };
    try {
      if (isEdit && appointment) {
        await updateAppointment(appointment.id, input);
        toast.success("Marcação guardada.");
      } else {
        await addAppointment(input);
        toast.success("Marcação criada.");
      }
      onOpenChange(false);
    } catch (error) {
      setSubmitError(saveErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!appointment || !canWrite) return;
    setSubmitError(null);
    setIsDeleting(true);
    try {
      await deleteAppointment(appointment.id);
      toast.success("Marcação eliminada.");
      onOpenChange(false);
    } catch {
      setSubmitError("Não foi possível eliminar a marcação. Tenta outra vez.");
    } finally {
      setIsDeleting(false);
    }
  };

  const title = !canWrite ? "Marcação" : isEdit ? "Editar marcação" : "Nova marcação";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="first-letter:uppercase">
            {isValidDay(String(day ?? "")) ? formatDayLong(String(day)) : "Escolhe o dia e a hora."}
          </DialogDescription>
        </DialogHeader>

        {deleteStep === "confirm" && canWrite && appointment ? (
          <DialogDeleteConfirm
            title="Eliminar esta marcação?"
            description={`${appointment.serviceType} · ${appointment.customerName}`}
            warning="Ação permanente. Para guardar o registo, muda o estado para «Cancelada» ou «Faltou»."
            error={submitError}
            isDeleting={isDeleting}
            onBack={() => {
              setDeleteStep("idle");
              setSubmitError(null);
            }}
            onConfirm={() => void handleDelete()}
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <fieldset disabled={!canWrite} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
              <div className="grid gap-2">
                <Label htmlFor="ap-service">Tipo de serviço</Label>
                <Input
                  id="ap-service"
                  list="ap-service-list"
                  placeholder="Ex.: Lavagem completa"
                  maxLength={APPOINTMENT_LIMITS.serviceType}
                  autoComplete="off"
                  aria-invalid={errors.serviceType ? true : undefined}
                  {...register("serviceType")}
                />
                <datalist id="ap-service-list">
                  {serviceTypes.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
                {errors.serviceType && <p className={errorText}>{errors.serviceType.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ap-customer">Cliente</Label>
                <Input
                  id="ap-customer"
                  list="ap-customer-list"
                  placeholder="Nome do cliente"
                  maxLength={APPOINTMENT_LIMITS.customerName}
                  autoComplete="off"
                  aria-invalid={errors.customerName ? true : undefined}
                  aria-describedby="ap-customer-hint"
                  {...customerField}
                  onChange={(e) => {
                    void customerField.onChange(e);
                    handleCustomerInput(e.target.value);
                  }}
                />
                <datalist id="ap-customer-list">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
                {errors.customerName ? (
                  <p className={errorText}>{errors.customerName.message}</p>
                ) : (
                  <p id="ap-customer-hint" className="text-xs text-muted-foreground">
                    {customerId ? "Cliente da tua lista." : "Escolhe da lista ou escreve o nome de alguém novo."}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid content-start gap-2">
                  <Label htmlFor="ap-phone">Telefone (opcional)</Label>
                  <Input
                    id="ap-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="912 345 678"
                    maxLength={APPOINTMENT_LIMITS.phone}
                    {...register("phone")}
                  />
                  {errors.phone && <p className={errorText}>{errors.phone.message}</p>}
                </div>
                <div className="grid content-start gap-2">
                  <Label htmlFor="ap-plate">Matrícula (opcional)</Label>
                  <Input
                    id="ap-plate"
                    list={customerVehicles.length > 0 ? "ap-plate-list" : undefined}
                    placeholder="AA-00-AA"
                    autoCapitalize="characters"
                    autoComplete="off"
                    maxLength={APPOINTMENT_LIMITS.plate}
                    className="uppercase"
                    {...plateField}
                    onChange={(e) => {
                      void plateField.onChange(e);
                      handlePlateInput(e.target.value);
                    }}
                  />
                  {customerVehicles.length > 0 && (
                    <datalist id="ap-plate-list">
                      {customerVehicles.map((v) => (
                        <option key={v.id} value={v.plate}>{`${v.make} ${v.model}`.trim()}</option>
                      ))}
                    </datalist>
                  )}
                  {errors.plate && <p className={errorText}>{errors.plate.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="grid content-start gap-2">
                  <Label htmlFor="ap-day">Data</Label>
                  <Input id="ap-day" type="date" aria-invalid={errors.day ? true : undefined} {...register("day")} />
                  {errors.day && <p className={errorText}>{errors.day.message}</p>}
                </div>
                <div className="grid content-start gap-2">
                  <Label htmlFor="ap-start">Início</Label>
                  <Input
                    id="ap-start"
                    type="time"
                    step={300}
                    aria-invalid={errors.startTime ? true : undefined}
                    aria-describedby="ap-time-hint"
                    {...startField}
                    onChange={(e) => {
                      handleStartChange(e.target.value);
                      void startField.onChange(e);
                    }}
                  />
                  {errors.startTime && <p className={errorText}>{errors.startTime.message}</p>}
                </div>
                <div className="grid content-start gap-2">
                  <Label htmlFor="ap-end">Fim (opcional)</Label>
                  <Input
                    id="ap-end"
                    type="time"
                    step={300}
                    disabled={!startTime}
                    aria-invalid={errors.endTime ? true : undefined}
                    aria-describedby="ap-time-hint"
                    {...register("endTime")}
                  />
                  {errors.endTime && <p className={errorText}>{errors.endTime.message}</p>}
                </div>
              </div>
              <p id="ap-time-hint" className="-mt-2 text-xs text-muted-foreground">
                Sem hora fica em «Sem hora». Só o início é uma hora certa; com fim é um intervalo (ex.: lavagens).
              </p>

              {isEdit && (
                <div className="grid gap-2 sm:max-w-[12rem]">
                  <Label htmlFor="ap-status">Estado</Label>
                  <Select id="ap-status" {...register("status")}>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="ap-notes">Notas (opcional)</Label>
                <textarea
                  id="ap-notes"
                  rows={2}
                  maxLength={APPOINTMENT_LIMITS.notes}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  {...register("notes")}
                />
                {errors.notes && <p className={errorText}>{errors.notes.message}</p>}
              </div>
            </fieldset>

            {canWrite ? (
              <DialogFormActions
                onCancel={() => onOpenChange(false)}
                submitLabel={isEdit ? "Guardar" : "Criar marcação"}
                isSubmitting={isSubmitting}
                error={submitError}
                deleteLabel={isEdit ? "Eliminar marcação" : undefined}
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
