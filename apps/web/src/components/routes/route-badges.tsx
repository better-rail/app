import { useT } from "@/i18n"
import { cn } from "@/lib/cn"

export function DelayBadge({ minutes, className }: { minutes: number; className?: string }) {
  const t = useT()
  return <span className={cn("badge bg-danger-badge text-white tabular", className)}>{t("routes.delayed", { minutes })}</span>
}

export function CancelledBadge({ className }: { className?: string }) {
  const t = useT()
  return <span className={cn("badge bg-danger-badge text-white", className)}>{t("routes.cancelled")}</span>
}

export function ShortRouteBadge({ className }: { className?: string }) {
  const t = useT()
  return <span className={cn("badge bg-success-soft text-success", className)}>{t("routes.shortRoute")}</span>
}

export function SlowTrainBadge({ className }: { className?: string }) {
  const t = useT()
  return <span className={cn("badge bg-warning-soft text-warning", className)}>{t("routes.slowTrain")}</span>
}

export function useChangesText() {
  const t = useT()
  return (changes: number) =>
    changes === 0 ? t("routes.noChange") : changes === 1 ? t("routes.oneChange") : t("routes.changes", { count: changes })
}
