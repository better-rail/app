import type { Locale } from "@/i18n"
import { dateKey, isSameDay, naiveNow, addDays, parseNaive, type NaiveTime } from "./time"

const intlLocale = (locale: Locale) => (locale === "he" ? "he-IL" : "en-GB")

/** "שעה ו-20 דק׳" / "1h 20m" style durations from a millisecond count. */
export function formatDuration(durationMs: number, locale: Locale): string {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (locale === "he") {
    const hoursText = hours === 0 ? "" : hours === 1 ? "שעה" : hours === 2 ? "שעתיים" : `${hours} שעות`
    const minutesText = minutes === 0 ? "" : `${minutes} דק׳`
    if (hoursText && minutesText) return `${hoursText} ו-${minutesText}`
    return hoursText || minutesText || "0 דק׳"
  }

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/** Long-form duration for prose ("שעה ו-20 דקות" / "1 hour and 20 minutes"). */
export function formatDurationLong(durationMs: number, locale: Locale): string {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (locale === "he") {
    const h = hours === 0 ? "" : hours === 1 ? "שעה" : hours === 2 ? "שעתיים" : `${hours} שעות`
    const m = minutes === 0 ? "" : minutes === 1 ? "דקה" : `${minutes} דקות`
    return h && m ? `${h} ו-${m}` : h || m || "0 דקות"
  }
  const h = hours === 0 ? "" : hours === 1 ? "1 hour" : `${hours} hours`
  const m = minutes === 0 ? "" : minutes === 1 ? "1 minute" : `${minutes} minutes`
  return h && m ? `${h} and ${m}` : h || m || "0 minutes"
}

/** "יום ה׳, 4 בספט׳" / "Thu, 4 Sept" — with "היום"/"מחר" for the next two days. */
export function formatDayLabel(naive: NaiveTime, locale: Locale, now: NaiveTime = naiveNow()): string {
  const formatted = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(naive))

  if (isSameDay(naive, now)) return locale === "he" ? `היום · ${formatted}` : `Today · ${formatted}`
  if (isSameDay(naive, addDays(now, 1))) return locale === "he" ? `מחר · ${formatted}` : `Tomorrow · ${formatted}`
  return formatted
}

/**
 * The planner's date field: "היום" / "מחר", or a numeric `05/09/2026` that reads the same in both directions.
 * Both arguments are `YYYY-MM-DD` keys, matching the `<input type="date">` value.
 */
export function formatDateField(date: string, locale: Locale, today: string): string {
  if (date === today) return locale === "he" ? "היום" : "Today"
  if (date === dateKey(addDays(parseNaive(today), 1))) return locale === "he" ? "מחר" : "Tomorrow"
  const [year, month, day] = date.split("-")
  return `${day}/${month}/${year}`
}

export function formatShortDate(naive: NaiveTime, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(naive))
}

export function formatLongDate(naive: NaiveTime, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(naive))
}

export function formatDateInput(naive: NaiveTime): string {
  return dateKey(naive)
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value)
}
