import { useShallow } from "zustand/react/shallow"
import HapticFeedback from "react-native-haptic-feedback"
import type { DayType } from "@/data/rail-map-layout"
import { type StationAlert, stationAlertFor, useSettingsStore } from "@/models"
import { trackEvent } from "@/services/analytics"
import { usePushPermission } from "@/hooks"

/**
 * Following a station: whether it is followed, and turning that on (asking for the notification
 * permission first) or off. Shared by the bell in the station's header and the card on its page.
 */
export function useStationAlert(stationId: string, source: string) {
  const { alerts, setStationAlert, removeStationAlert } = useSettingsStore(
    useShallow((s) => ({
      alerts: s.stationAlerts,
      setStationAlert: s.setStationAlert,
      removeStationAlert: s.removeStationAlert,
    })),
  )
  const alert: StationAlert | undefined = stationAlertFor(alerts, stationId)
  const { permission, ensure } = usePushPermission()

  /** Follows the station on every line, once notifications are allowed. Resolves whether it went through. */
  const turnOn = async (): Promise<boolean> => {
    const allowed = await ensure("station_alerts", {
      title: "stationAlerts.cardTitle",
      message: "stationAlerts.permissionDenied",
    })
    if (!allowed) return false
    HapticFeedback.trigger("impactLight")
    trackEvent("station_alert_enabled", { stationId, source })
    setStationAlert(stationId)
    return true
  }

  const turnOff = () => {
    HapticFeedback.trigger("impactLight")
    trackEvent("station_alert_disabled", { stationId, source })
    removeStationAlert(stationId)
  }

  const setLines = (lineIds: string[] | null) => {
    HapticFeedback.trigger("selection")
    trackEvent("station_alert_lines_changed", { stationId, lines: lineIds ?? "all" })
    setStationAlert(stationId, { lineIds })
  }

  const setDays = (dayTypes: DayType[] | null) => {
    HapticFeedback.trigger("selection")
    trackEvent("station_alert_days_changed", { stationId, days: dayTypes ?? "always" })
    setStationAlert(stationId, { dayTypes })
  }

  return { alert, permission, turnOn, turnOff, setLines, setDays }
}
