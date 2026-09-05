import { CalendarDays, Clock, RotateCcw } from "lucide-react"
import { useT } from "@/i18n"
import { cn } from "@/lib/cn"

export interface DateTimeValue {
  /** `YYYY-MM-DD`, or undefined for "now" */
  date?: string
  /** `HH:mm`, or undefined for "now" */
  time?: string
}

export function DateTimePicker({
  value,
  onChange,
  today,
  now,
  className,
  compact = false,
}: {
  value: DateTimeValue
  onChange: (value: DateTimeValue) => void
  /** Israel's date today (`YYYY-MM-DD`) — used as the minimum and as the "now" placeholder */
  today: string
  /** Israel's current time (`HH:mm`) */
  now: string
  className?: string
  compact?: boolean
}) {
  const t = useT()
  const isNow = !value.date && !value.time
  const fieldClass = cn(
    "flex items-center gap-2 rounded-xl border border-line bg-surface px-3 text-[15px] font-medium transition-colors hover:border-line-strong focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20",
    compact ? "h-11" : "h-14",
  )
  const inputClass = "min-w-0 flex-1 bg-transparent tabular outline-none"

  return (
    <div className={cn("flex flex-wrap items-stretch gap-2", className)}>
      <label className={cn(fieldClass, "min-w-[150px] flex-1")}>
        <CalendarDays className="size-[18px] shrink-0 text-dim" />
        <span className="sr-only">{t("plan.date")}</span>
        <input
          type="date"
          value={value.date ?? today}
          min={today}
          onChange={(event) => onChange({ ...value, date: event.target.value || undefined })}
          className={inputClass}
        />
      </label>
      <label className={cn(fieldClass, "min-w-[120px] flex-1")}>
        <Clock className="size-[18px] shrink-0 text-dim" />
        <span className="sr-only">{t("plan.time")}</span>
        <input
          type="time"
          value={value.time ?? now}
          onChange={(event) => onChange({ ...value, time: event.target.value || undefined })}
          className={inputClass}
        />
      </label>
      <button
        type="button"
        onClick={() => onChange({})}
        disabled={isNow}
        className={cn("btn-secondary shrink-0 gap-1.5 px-3.5", compact ? "h-11" : "h-14", isNow && "!opacity-60")}
        aria-label={t("plan.now")}
        title={t("plan.now")}
      >
        <RotateCcw className="size-4" />
        {t("plan.now")}
      </button>
    </div>
  )
}
