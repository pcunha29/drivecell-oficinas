import { Badge } from "@/components/ui/badge";
import { describeStatus, type StatusTone } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<StatusTone, string> = {
  trial: "border-transparent bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  active:
    "border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  warning:
    "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  danger: "border-transparent bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  muted: "border-transparent bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
};

export function StatusBadge({
  status,
  trialEndsAt,
  className,
}: {
  status: string;
  trialEndsAt: string | null;
  className?: string;
}) {
  const { label, tone } = describeStatus(status, trialEndsAt);
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", TONE_CLASSES[tone], className)}>
      {label}
    </Badge>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
        className,
      )}
    >
      Demo
    </Badge>
  );
}
