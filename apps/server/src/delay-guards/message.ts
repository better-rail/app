/**
 * message.ts — the words of a Delay Notifications push, in the device's language: the
 * train, how late it is and when it now leaves, and the reminder that a delay
 * can shrink again, so the rider does not bank on it.
 */
import { stationNameIn } from "../data/stations"
import { LanguageCode, translate } from "../locales/i18n"
import type { AlertMessage } from "../station-alerts/message"
import type { DelayGuard } from "../types/delay-guards"
import type { AlertLocale } from "../types/station-alerts"
import { toIsoString } from "../utils/gtfs-time"
import type { GuardPush, GuardState } from "./derive"

const t = (key: string, locale: AlertLocale, options?: Record<string, string | number>): string =>
  translate(`delayGuard.${key}`, locale as LanguageCode, options)

const clock = (naiveMs: number): string => toIsoString(naiveMs).slice(11, 16)

export const guardMessage = (push: GuardPush, state: GuardState, guard: DelayGuard, locale: AlertLocale): AlertMessage => {
  const origin = stationNameIn(guard.originStationId, locale)
  const destination = stationNameIn(guard.destinationStationId, locale)
  const scheduled = state.status === "watching" ? clock(state.scheduledDepTs) : guard.departureTime
  const title = t("title", locale, { trainNumber: guard.trainNumber, origin, destination, time: scheduled })
  if (push.kind === "cancelled") return { title, body: t("cancelled", locale) }
  const expected = state.status === "watching" ? clock(state.scheduledDepTs + push.delayMin * 60_000) : scheduled
  return {
    title,
    body: `${t("delayed", locale, { minutes: push.delayMin, expected })} ${t("reminder", locale)}`,
  }
}
