import { format } from "date-fns"
import { translate, userLocale } from "@/i18n"
import { getStationById } from "@/data/stations"
import { getRailLine } from "@/data/rail-lines"
import type { AffectedTrain, Disruption, LineStatus, ServiceStatusLevel } from "@/services/api"

export const stationName = (stationId: string): string => getStationById(stationId)?.name ?? stationId

/** The line's name in the current language, falling back to what the server sent. */
export const lineName = (lineStatus: Pick<LineStatus, "lineId" | "line">): string =>
  getRailLine(lineStatus.lineId)?.name[userLocale] ?? (userLocale === "he" ? lineStatus.line.name.he : lineStatus.line.name.en)

export const levelLabel = (level: ServiceStatusLevel): string => translate(`serviceStatus.levels.${level}`) ?? level

export const levelDescription = (level: ServiceStatusLevel): string => translate(`serviceStatus.levelDescriptions.${level}`) ?? ""

export const disruptionTitle = (disruption: Disruption): string =>
  translate(`serviceStatus.disruptions.${disruption.kind}`) ?? disruption.kind

/** One sentence on what the disruption means for the line, when there is a stretch to name. */
export const disruptionSummary = (disruption: Disruption): string | undefined => {
  const { section } = disruption
  if (!section) return undefined
  const from = stationName(section.fromStationId)
  const to = stationName(section.toStationId)
  if (disruption.kind === "skippedStops") {
    return translate("serviceStatus.notStoppingAt", { stations: section.stationIds.map(stationName).join(", ") }) ?? undefined
  }
  if (disruption.kind === "suspension" || disruption.kind === "curtailment" || disruption.kind === "cancellations") {
    return translate("serviceStatus.noServiceBetween", { from, to }) ?? undefined
  }
  return translate("serviceStatus.affectedStretch", { from, to }) ?? undefined
}

/** "HH:mm" of a naive wall-clock ISO string from the timetable ("2026-09-10T08:30:00"). */
export const clockTime = (naiveIso: string): string => {
  const date = new Date(naiveIso)
  return Number.isNaN(date.getTime()) ? naiveIso.slice(11, 16) : format(date, "HH:mm")
}

/** The one-line consequence for a train: late by, cancelled, terminates early, skips stops. */
export const trainConsequence = (train: AffectedTrain): string => {
  switch (train.status) {
    case "cancelled":
      return translate("serviceStatus.cancelled") ?? ""
    case "curtailed":
      return (
        translate("serviceStatus.terminatesAt", {
          station: stationName(train.actualDestinationStationId ?? train.destinationStationId),
        }) ?? ""
      )
    case "skippingStops":
      return (
        translate("serviceStatus.skipsStations", { stations: (train.skippedStationIds ?? []).map(stationName).join(", ") }) ?? ""
      )
    default:
      return translate("serviceStatus.minutesLate", { minutes: train.delayMinutes }) ?? ""
  }
}
