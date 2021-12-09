import { formatRelative, differenceInMinutes } from "date-fns"
import { dateFnsLocalization, translate } from "."

const now = new Date()

export function useFormattedDate(date: Date) {
  if (differenceInMinutes(date, now) < 2) return translate("plan.now")
  return formatRelative(date, now, { locale: dateFnsLocalization })
}
