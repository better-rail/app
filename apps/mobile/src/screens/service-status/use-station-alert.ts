import { useEffect, useState } from "react"
import { Alert, Linking } from "react-native"
import { useShallow } from "zustand/react/shallow"
import HapticFeedback from "react-native-haptic-feedback"
import { translate } from "@/i18n"
import type { DayType } from "@/data/rail-map-layout"
import { type StationAlert, stationAlertFor, useSettingsStore } from "@/models"
import { trackEvent } from "@/services/analytics"
import { useAppState } from "@/hooks"
import { type AlertsPermission, getStationAlertsPermission, requestStationAlertsPermission } from "@/utils/station-alerts"

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
  const appState = useAppState()
  const [permission, setPermission] = useState<AlertsPermission>()

  // The permission can change in the device settings while the app is away.
  useEffect(() => {
    if (appState === "active") getStationAlertsPermission().then(setPermission)
  }, [appState])

  /** Follows the station on every line, once notifications are allowed. Resolves whether it went through. */
  const turnOn = async (): Promise<boolean> => {
    let granted = permission
    if (granted !== "granted") {
      granted = await requestStationAlertsPermission()
      setPermission(granted)
      if (granted === "granted") trackEvent("notification_permission_granted", { source: "station_alerts" })
    }
    if (granted !== "granted") {
      Alert.alert(translate("stationAlerts.cardTitle") ?? "", translate("stationAlerts.permissionDenied") ?? "", [
        { text: translate("common.cancel") ?? "", style: "cancel" },
        { text: translate("stationAlerts.openSettings") ?? "", onPress: () => Linking.openSettings() },
      ])
      return false
    }
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
