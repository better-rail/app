import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLocale, useT } from "@/i18n"
import { cn } from "@/lib/cn"
import { formatDateField, formatLongDate } from "@/lib/format"
import {
  compareYearMonth,
  monthGrid,
  monthTitle,
  sameDayIn,
  shiftMonth,
  weekdayLabels,
  yearMonthOf,
  type MonthGridCell,
  type YearMonth,
} from "@/lib/month-grid"
import { addDays, dateKey, parseNaive } from "@/lib/time"

const monthKey = ({ year, month }: YearMonth) => `${year}-${month}`
/** `YYYY-MM-DD` keys sort as strings. */
const clampMin = (key: string, min: string) => (key < min ? min : key)

/**
 * A month grid for picking one day on or after `min`. Sunday-first (Israel's week), Friday and Saturday drawn muted,
 * always six rows so paging months never moves the footer. A single tab stop: the arrow keys walk the days — mirrored
 * under RTL, so "right" still means "later in the row" — Home/End jump within the week, PageUp/PageDown page months,
 * Enter picks.
 */
export function Calendar({
  value,
  min,
  today,
  onSelect,
  autoFocus = false,
  className,
}: {
  /** The selected day (`YYYY-MM-DD`) */
  value: string
  /** Earliest selectable day */
  min: string
  today: string
  onSelect: (date: string) => void
  /** Focus the selected day once mounted (for keyboard and screen-reader users opening the popover) */
  autoFocus?: boolean
  className?: string
}) {
  const t = useT()
  const locale = useLocale()
  const rtl = locale === "he"
  const titleId = useId()
  const gridRef = useRef<HTMLDivElement>(null)
  const [month, setMonth] = useState(() => yearMonthOf(value))
  /** The roving tab stop: the one tabbable cell, and the one the arrow keys move. */
  const [focused, setFocused] = useState(value)
  const pendingFocus = useRef(autoFocus)

  const cells = useMemo(() => monthGrid(month), [month])
  const weeks = useMemo(() => Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7)), [cells])
  const weekdays = useMemo(() => weekdayLabels(locale), [locale])
  const tomorrow = dateKey(addDays(parseNaive(today), 1))
  const canGoBack = compareYearMonth(month, yearMonthOf(min)) > 0

  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    gridRef.current?.querySelector<HTMLElement>(`[data-key="${focused}"]`)?.focus({ preventScroll: true })
  }, [focused, month])

  // A selection made outside the grid (a typed date): show its month and put the tab stop on it.
  useEffect(() => {
    setMonth(yearMonthOf(value))
    setFocused(value)
  }, [value])

  /** The chevrons: keep the tab stop on the same day of the new month so Tab still lands in the grid. */
  const goMonth = (delta: number) => {
    const target = shiftMonth(month, delta)
    setMonth(target)
    setFocused(clampMin(sameDayIn(focused, target), min))
  }

  /** Keyboard: move the tab stop (paging the month with it) and focus it once rendered. */
  const moveFocus = (next: string) => {
    const clamped = clampMin(next, min)
    setFocused(clamped)
    setMonth(yearMonthOf(clamped))
    pendingFocus.current = true
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const naive = parseNaive(focused)
    const weekday = new Date(naive).getUTCDay()
    const byDays: Record<string, number | undefined> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowDown: 7,
      ArrowUp: -7,
      Home: -weekday,
      End: 6 - weekday,
    }
    const days = byDays[event.key]
    if (days !== undefined) {
      event.preventDefault()
      moveFocus(dateKey(addDays(naive, days)))
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault()
      moveFocus(sameDayIn(focused, shiftMonth(yearMonthOf(focused), event.key === "PageUp" ? -1 : 1)))
    }
  }

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-1 flex items-center justify-between ps-1.5">
        <span key={monthKey(month)} id={titleId} aria-live="polite" className="animate-fade-in text-[16px] font-bold">
          {monthTitle(month, locale)}
        </span>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            disabled={!canGoBack}
            aria-label={t("picker.prevMonth")}
            className="icon-btn size-9 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="size-5 rtl:-scale-x-100" />
          </button>
          <button type="button" onClick={() => goMonth(1)} aria-label={t("picker.nextMonth")} className="icon-btn size-9">
            <ChevronRight className="size-5 rtl:-scale-x-100" />
          </button>
        </div>
      </div>

      <div ref={gridRef} role="grid" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <div role="row" className="grid grid-cols-7">
          {weekdays.map((weekday, index) => (
            <div
              key={index}
              role="columnheader"
              className="py-1 text-center text-[12px] font-semibold uppercase tracking-wide text-dim"
            >
              {weekday}
            </div>
          ))}
        </div>
        <div key={monthKey(month)} className="animate-fade-in flex flex-col gap-0.5">
          {weeks.map((week, index) => (
            <div key={index} role="row" className="grid grid-cols-7">
              {week.map((cell) =>
                cell.inMonth ? (
                  <DayCell
                    key={cell.key}
                    cell={cell}
                    label={formatLongDate(parseNaive(cell.key), locale)}
                    selected={cell.key === value}
                    isToday={cell.key === today}
                    disabled={cell.key < min}
                    tabbable={cell.key === focused}
                    onSelect={onSelect}
                    onFocus={() => setFocused(cell.key)}
                  />
                ) : (
                  <div key={cell.key} role="gridcell" aria-hidden="true" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 px-1">
        {[today, tomorrow].map((key) => (
          <button
            type="button"
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              "h-8 rounded-full px-3 text-[13px] font-semibold transition-colors",
              key === value ? "bg-brand-soft text-brand-text" : "bg-surface-3 text-text-2 hover:bg-line",
            )}
          >
            {formatDateField(key, locale, today)}
          </button>
        ))}
      </div>
    </div>
  )
}

function DayCell({
  cell,
  label,
  selected,
  isToday,
  disabled,
  tabbable,
  onSelect,
  onFocus,
}: {
  cell: MonthGridCell
  label: string
  selected: boolean
  isToday: boolean
  disabled: boolean
  tabbable: boolean
  onSelect: (date: string) => void
  onFocus: () => void
}) {
  return (
    <button
      type="button"
      role="gridcell"
      data-key={cell.key}
      tabIndex={tabbable ? 0 : -1}
      aria-selected={selected}
      aria-current={isToday ? "date" : undefined}
      aria-label={label}
      disabled={disabled}
      onClick={() => onSelect(cell.key)}
      onFocus={onFocus}
      className={cn(
        "relative mx-auto flex aspect-square w-full max-w-12 items-center justify-center rounded-full text-[15px] tabular transition-colors duration-150",
        selected ? "bg-brand font-bold text-white shadow-[0_1px_2px_rgb(0_0_0/0.2)]" : "hover:bg-surface-3",
        !selected && isToday && "font-bold text-brand-text",
        !selected && !isToday && cell.weekend && "text-muted",
        disabled && "cursor-not-allowed opacity-35 hover:bg-transparent",
      )}
    >
      {cell.day}
      {isToday && !selected && <span aria-hidden="true" className="absolute bottom-[5px] size-1 rounded-full bg-brand" />}
    </button>
  )
}
