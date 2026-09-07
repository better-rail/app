import type { Locale } from "@/i18n"
import { intlLocale } from "./format"
import { addDays, dateKey, isWeekend } from "./time"

/** A calendar month; `month` is 1-based, like the `MM` of a `YYYY-MM-DD` key. */
export interface YearMonth {
  year: number
  month: number
}

export interface MonthGridCell {
  /** `YYYY-MM-DD` */
  key: string
  day: number
  /** False for the padding days that belong to the previous or next month. */
  inMonth: boolean
  /** Friday or Saturday — trains are sparse, so the day is drawn muted. */
  weekend: boolean
}

export function yearMonthOf(key: string): YearMonth {
  const [year, month] = key.split("-").map(Number)
  return { year, month }
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** Negative when `a` is before `b`, zero for the same month. */
export const compareYearMonth = (a: YearMonth, b: YearMonth) => a.year * 12 + a.month - (b.year * 12 + b.month)

export const daysInMonth = ({ year, month }: YearMonth) => new Date(Date.UTC(year, month, 0)).getUTCDate()

/** The same day-of-month in `target`, clamped to its length — so paging from 31 January lands on 28 February. */
export function sameDayIn(key: string, target: YearMonth): string {
  const day = Math.min(Number(key.slice(8, 10)), daysInMonth(target))
  return dateKey(Date.UTC(target.year, target.month - 1, day))
}

/**
 * Six Sunday-first weeks (42 cells) starting on or before the 1st. Always six, so the grid keeps one height while the
 * user pages through months.
 */
export function monthGrid(month: YearMonth): MonthGridCell[] {
  const first = Date.UTC(month.year, month.month - 1, 1)
  const start = addDays(first, -new Date(first).getUTCDay())
  return Array.from({ length: 42 }, (_, index) => {
    const naive = addDays(start, index)
    const date = new Date(naive)
    return {
      key: dateKey(naive),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month.month - 1,
      weekend: isWeekend(naive),
    }
  })
}

/** "ספטמבר 2026" / "September 2026" */
export function monthTitle({ year, month }: YearMonth, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(year, month - 1, 1),
  )
}

/** Sunday-first column headers: "א׳ … ש׳" / "Sun … Sat". Israel's week starts on Sunday in either language. */
export function weekdayLabels(locale: Locale): string[] {
  const sunday = Date.UTC(2023, 0, 1)
  const format = new Intl.DateTimeFormat(intlLocale(locale), { weekday: locale === "he" ? "narrow" : "short", timeZone: "UTC" })
  return Array.from({ length: 7 }, (_, index) => format.format(addDays(sunday, index)))
}
