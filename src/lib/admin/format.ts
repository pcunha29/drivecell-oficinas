export const LISBON_TZ = "Europe/Lisbon";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Em teste",
  active: "Ativa",
  past_due: "Pagamento em atraso",
  canceled: "Cancelada",
};

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: LISBON_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: LISBON_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "26/09/2026" (hora de Lisboa). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

/** "26/09/2026, 14:05" (hora de Lisboa). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : dateTimeFormatter.format(date);
}

/** Valor para <input type="date"> (YYYY-MM-DD no dia de Lisboa). */
export function toLisbonDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LISBON_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Diferença (minutos) entre a hora de Lisboa e UTC num dado instante (0 ou 60). */
function lisbonOffsetMinutes(at: Date): number {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: LISBON_TZ,
    timeZoneName: "longOffset",
  })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = part?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

/** "2026-10-10" → ISO de 10/10/2026 às 23:59:59 em Lisboa (o dia conta por inteiro). */
export function lisbonEndOfDayIso(dateInput: string): string {
  const [y, m, d] = dateInput.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 23, 59, 59);
  const offset = lisbonOffsetMinutes(new Date(guess));
  return new Date(guess - offset * 60_000).toISOString();
}

export type StatusTone = "trial" | "active" | "warning" | "danger" | "muted";

/** Estado mostrado no admin (teste expirado = só-leitura). */
export function describeStatus(
  status: string,
  trialEndsAt: string | null,
  now: Date = new Date(),
): { label: string; tone: StatusTone } {
  switch (status) {
    case "trialing": {
      const ends = trialEndsAt ? new Date(trialEndsAt) : null;
      if (ends && ends.getTime() > now.getTime()) {
        return {
          label: `Em teste até ${formatDate(trialEndsAt)}`,
          tone: "trial",
        };
      }
      return { label: "Só-leitura (teste expirado)", tone: "muted" };
    }
    case "active":
      return { label: "Ativa", tone: "active" };
    case "past_due":
      return { label: "Pagamento em atraso", tone: "warning" };
    case "canceled":
      return { label: "Cancelada", tone: "danger" };
    default:
      return { label: status, tone: "muted" };
  }
}
