/**
 * message.ts — the words of a station alert, in the device's language.
 *
 * The title is the station; the body says what is wrong there (or that it no
 * longer is), the way the station card on the app's status screen puts it. A
 * device that asked about particular lines gets the line named first, so a
 * rider who only cares about one of them knows at a glance.
 */
import { stationNameIn } from "../data/stations"
import { LanguageCode, translate } from "../locales/i18n"
import { railLineById, type RailLineId } from "../status/lines"
import type { LocalizedText } from "../types/service-status"
import type { AlertLocale } from "../types/station-alerts"
import type { StationAlertState } from "./derive"

export type AlertMessage = { title: string; body: string }

/** The catalogue names lines in Hebrew and English; the other languages get English. */
const lineNameIn = (lineId: string, locale: AlertLocale): string | undefined => {
  const line = railLineById.get(lineId as RailLineId)
  if (!line) return undefined
  return locale === "he" ? line.name.he : line.name.en
}

const localized = (text: LocalizedText, locale: AlertLocale): string => text[locale] || text.en || text.he

const t = (key: string, locale: AlertLocale, options?: Record<string, string | number>): string =>
  translate(`stationAlerts.${key}`, locale as LanguageCode, options)

/** What is wrong, without the line. */
const trouble = (state: StationAlertState, stationId: string, locale: AlertLocale): string => {
  const { headline, trains } = state
  const station = stationNameIn(stationId, locale)
  if (headline) {
    const from = headline.section ? stationNameIn(headline.section.fromStationId, locale) : ""
    const to = headline.section ? stationNameIn(headline.section.toStationId, locale) : ""
    const stretch = headline.section && headline.section.fromStationId !== headline.section.toStationId
    if (headline.source === "announcement") {
      const what =
        headline.kind === "skippedStops"
          ? t("notStopping", locale, { station })
          : stretch
            ? t("noServiceBetween", locale, { from, to })
            : t("noServiceAt", locale, { station })
      return headline.reason
        ? t("plannedWithReason", locale, { what, reason: localized(headline.reason, locale) })
        : t("planned", locale, { what })
    }
    switch (headline.kind) {
      case "suspension":
        return stretch ? t("noServiceBetween", locale, { from, to }) : t("noServiceAt", locale, { station })
      case "curtailment":
        return stretch ? t("terminatingEarly", locale, { from, to }) : t("terminatingEarlyAt", locale, { station })
      case "cancellations":
        return stretch ? t("cancellationsBetween", locale, { from, to }) : t("cancellationsAt", locale, { station })
      case "skippedStops":
        return t("notStopping", locale, { station })
      default:
        break
    }
  }
  if (trains.cancelled >= 2) return t("cancelledTrains", locale, { count: trains.cancelled })
  if (trains.cancelled === 1) return t("cancelledTrain", locale)
  if (trains.late > 0) {
    const key = state.level === "severeDelays" ? "severeDelays" : "delays"
    return t(key, locale, { minutes: trains.maxDelayMinutes })
  }
  return t("disruption", locale)
}

/**
 * The alert's words. `specificLines` is whether the device asked about particular lines, in which
 * case the line the trouble is on leads the body.
 */
export const alertMessage = (
  push: "disruption" | "cleared",
  state: StationAlertState,
  stationId: string,
  locale: AlertLocale,
  specificLines: boolean,
): AlertMessage => {
  const title = stationNameIn(stationId, locale)
  if (push === "cleared") return { title, body: t("resumed", locale) }

  let body = trouble(state, stationId, locale)
  const lineId = state.headline?.lineId ?? (state.trains.lineIds.length === 1 ? state.trains.lineIds[0] : undefined)
  const line = specificLines && lineId ? lineNameIn(lineId, locale) : undefined
  if (line) body = t("onLine", locale, { line, text: body })
  return { title, body }
}
