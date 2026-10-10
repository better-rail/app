import { router } from "expo-router"
import { getStationById } from "@/data/stations"
import { trackEvent } from "@/services/analytics"

/** The data a station alert push carries (see apps/server/src/station-alerts/notify.ts). */
export type StationAlertPayload = { type: "station-alert"; stationId: string }

export const isStationAlertPayload = (data: unknown): data is StationAlertPayload => {
  const d = data as Partial<StationAlertPayload> | null | undefined
  return d?.type === "station-alert" && typeof d.stationId === "string"
}

/** A tapped station alert opens the station's card on the Service Status screen. */
export const openStationAlert = (stationId: string) => {
  if (!getStationById(stationId)) return
  trackEvent("station_alert_opened", { stationId })
  // `navigate`, not `push`: a status screen already open is reused rather than stacked.
  router.navigate({ pathname: "/service-status", params: { stationId } })
}
