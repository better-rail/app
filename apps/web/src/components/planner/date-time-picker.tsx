import { CalendarDays, Clock, RotateCcw, type LucideIcon } from "lucide-react"
import type { ComponentProps } from "react"
import { useLocale, useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { formatDateField } from "@/lib/format"

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
  const locale = useLocale()
  const isNow = !value.date && !value.time
  const fieldClass = cn(
    "flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-[15px] font-medium transition-colors hover:border-line-strong focus-within:border-brand focus-within:ring-3 focus-within:ring-brand/20",
    compact ? "h-11" : "h-14",
  )

  return (
    <div className={cn("flex flex-wrap items-stretch gap-2", className)}>
      <PickerField
        icon={CalendarDays}
        label={t("plan.date")}
        display={formatDateField(value.date ?? today, locale, today)}
        className={cn(fieldClass, "min-w-[150px] flex-1")}
        type="date"
        value={value.date ?? today}
        min={today}
        onChange={(event) => onChange({ ...value, date: event.target.value || undefined })}
      />
      <PickerField
        icon={Clock}
        label={t("plan.time")}
        display={value.time ?? now}
        className={cn(fieldClass, "min-w-[120px] flex-1")}
        type="time"
        value={value.time ?? now}
        onChange={(event) => onChange({ ...value, time: event.target.value || undefined })}
      />
      <button
        type="button"
        onClick={() => onChange({ date: undefined, time: undefined })}
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

/**
 * A native date/time input that behaves on an RTL page: `dir="ltr"` keeps its segments in `05/09/2026` / `12:08`
 * order, and the input only shows itself while focused — otherwise the field renders our own `display` label
 * (so today's date can read "היום"). Both are stacked in one grid cell, so focusing never shifts the layout.
 */
function PickerField({
  icon: Icon,
  label,
  display,
  className,
  ...input
}: { icon: LucideIcon; label: string; display: string } & ComponentProps<"input">) {
  const locale = useLocale()
  // The input is `dir="ltr"`, so align it towards the page's start rather than its own.
  const align = locale === "he" ? "text-right" : "text-left"

  return (
    <label className={className}>
      <Icon className="size-[18px] shrink-0 text-dim" />
      <span className="sr-only">{label}</span>
      <span className="grid min-w-0 flex-1">
        <input
          {...input}
          dir="ltr"
          className={cn(
            "peer col-start-1 row-start-1 w-full min-w-0 cursor-pointer self-center bg-transparent tabular opacity-0 outline-none focus:opacity-100",
            align,
          )}
        />
        <span
          aria-hidden="true"
          className={cn("pointer-events-none col-start-1 row-start-1 self-center truncate tabular peer-focus:invisible", align)}
        >
          {display}
        </span>
      </span>
    </label>
  )
}
