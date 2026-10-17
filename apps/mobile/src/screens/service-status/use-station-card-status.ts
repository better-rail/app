import { useMemo } from "react"
import { addDays, format } from "date-fns"
import { dateFnsLocalization } from "@/i18n"
import type { DayType } from "@/data/rail-service-patterns"
import { useNow } from "@/hooks"
import { timezoneCorrection } from "@/utils/helpers/date-helpers"
import { type OpenState, stationOpenState, wallClockOf } from "./station-hours"
import { stationStatus, stationStatusKind } from "./station-status"
import { useServiceStatus } from "./use-service-status"
import { useStationDepartures, useStationInfo } from "./use-station-info"

/** A Sunday, to name the days of the week from. */
const A_SUNDAY = new Date(2023, 0, 1)

/**
 * Everything a station's card shows about how the station is doing right now: its headline, its
 * lines' next trains, its page from Israel Railways and whether it is open. Shared by the card's
 * header (the photo with the status pills) and its body, which each take what they need.
 */
export function useStationCardStatus(stationId: string, dayType: DayType) {
  const { data } = useServiceStatus()
  const { data: info, isLoading: infoLoading, isError: infoError } = useStationInfo(stationId)
  const { data: departures } = useStationDepartures(stationId)
  // Israel's clock, wherever the phone is: the station is there. Ticks each minute for the countdowns.
  const now = timezoneCorrection(useNow())
  const status = useMemo(
    () => stationStatus(data, stationId, dayType, departures, now),
    // `now` is a new Date each render; its minute is what changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, stationId, dayType, departures, now.getTime()],
  )
  const kind = stationStatusKind(status, !!info?.closed)
  const clock = wallClockOf(now)
  const openState: OpenState | undefined = info
    ? stationOpenState(info.entrances, clock)
    : infoLoading
      ? undefined
      : { state: "unknown" as const }
  // The seven names once, not per row per minute.
  const dayNames = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(addDays(A_SUNDAY, i), "EEE", { locale: dateFnsLocalization })),
    [],
  )
  const dayName = (day: number) => dayNames[day - 1]

  return { info, infoLoading, infoError, departures, now, status, kind, clock, openState, dayName }
}
