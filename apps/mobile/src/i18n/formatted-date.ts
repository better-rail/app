import { formatRelative, differenceInMinutes, format } from "date-fns"
import { dateFnsLocalization } from "./i18n"
import { translate } from "./translate"

export function useFormattedDate(date: Date) {
  const now = new Date()
  if (differenceInMinutes(date, now) < 2) return translate("plan.now")
  return formatRelative(date, now, { locale: dateFnsLocalization })
}

export function localizedDate(date: Date | string | number) {
  return format(new Date(date), "E, PP", { locale: dateFnsLocalization })
}
