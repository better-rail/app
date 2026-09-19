import { useEffect, useState } from "react"
import { Alert, Linking, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { useShallow } from "zustand/react/shallow"
import HapticFeedback from "react-native-haptic-feedback"
import { Button, Screen, Text } from "@/components"
import { translate } from "@/i18n"
import { getStationById } from "@/data/stations"
import { type DelayGuard, type StationAlert, useFavoritesStore, useSettingsStore } from "@/models"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { guardKey } from "@/services/api"
import { trackEvent } from "@/services/analytics"
import { useAppState, useIsDarkMode } from "@/hooks"
import { type AlertsPermission, getStationAlertsPermission, requestStationAlertsPermission } from "@/utils/station-alerts"
import { StationListItem } from "./station-list-item"

/** "All lines", or how many of them, and the days when not always, for a station's row. */
export const alertSummary = (alert: StationAlert): string => {
  const lines =
    alert.lineIds === null
      ? translate("stationAlerts.allLines")
      : alert.lineIds.length === 1
        ? translate("stationAlerts.oneLine")
        : translate("stationAlerts.someLines", { count: alert.lineIds.length })
  const days = alert.dayTypes?.map((day) => translate(`serviceStatus.dayType.${day}`)).join(", ")
  return days ? `${lines} · ${days}` : (lines ?? "")
}

/**
 * The station notifications page in the settings: the permission when it is still to be given, the
 * stations being followed (tap one for its card on the status screen, where its lines are chosen),
 * suggestions from the favourite routes, and the way to add more.
 */
export function NotificationsSetupScreen() {
  const router = useRouter()
  const isDarkMode = useIsDarkMode()
  const appState = useAppState()
  const { alerts, setStationAlert, removeStationAlert, guards, removeDelayGuard } = useSettingsStore(
    useShallow((s) => ({
      alerts: s.stationAlerts,
      setStationAlert: s.setStationAlert,
      removeStationAlert: s.removeStationAlert,
      guards: s.delayGuards,
      removeDelayGuard: s.removeDelayGuard,
    })),
  )
  const favoriteRoutes = useFavoritesStore((s) => s.routes)
  const [permission, setPermission] = useState<AlertsPermission>()

  useEffect(() => {
    if (appState === "active") getStationAlertsPermission().then(setPermission)
  }, [appState])

  const requestPermission = async () => {
    const granted = await requestStationAlertsPermission()
    setPermission(granted)
    if (granted === "granted") {
      trackEvent("notification_permission_granted", { source: "settings" })
      return
    }
    Alert.alert(translate("stationAlerts.settingsTitle") ?? "", translate("stationAlerts.permissionDenied") ?? "", [
      { text: translate("common.cancel") ?? "", style: "cancel" },
      { text: translate("stationAlerts.openSettings") ?? "", onPress: () => Linking.openSettings() },
    ])
  }

  const openStation = (stationId: string) => {
    HapticFeedback.trigger("impactLight")
    router.push({ pathname: "/service-status", params: { stationId } })
  }

  const remove = (stationId: string) => {
    HapticFeedback.trigger("impactLight")
    trackEvent("station_alert_disabled", { stationId, source: "settings" })
    removeStationAlert(stationId)
  }

  const add = (stationId: string) => {
    HapticFeedback.trigger("impactLight")
    trackEvent("station_alert_enabled", { stationId, source: "favorites" })
    setStationAlert(stationId)
  }

  const openGuard = (guard: DelayGuard) => {
    HapticFeedback.trigger("impactLight")
    useNavigationParamsStore.getState().setDelayGuardDraft(guard)
    router.push("/delay-guard")
  }

  const removeGuard = (guard: DelayGuard) => {
    HapticFeedback.trigger("impactLight")
    trackEvent("delay_guard_disabled", { trainNumber: guard.trainNumber, source: "settings" })
    removeDelayGuard(guardKey(guard))
  }

  // Stations of the favourite routes not followed yet, as suggestions.
  const followed = new Set(alerts.map((a) => a.stationId))
  const suggested = [...new Set(favoriteRoutes.flatMap((route) => [route.originId, route.destinationId]))].filter(
    (id) => !followed.has(id) && getStationById(id),
  )

  return (
    <Screen style={styles.screen} unsafe statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"} translucent>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.emoji}>🔔</Text>
          <Text
            tx={permission === "granted" ? "stationAlerts.setupContent" : "stationAlerts.requestPermission"}
            style={styles.introText}
          />
        </View>

        {permission !== undefined && permission !== "granted" && (
          <Button
            title={translate(permission === "denied" ? "stationAlerts.openSettings" : "stationAlerts.enableNotifications") ?? ""}
            onPress={permission === "denied" ? () => Linking.openSettings() : requestPermission}
            testID="station-alerts-enable"
          />
        )}

        <View style={styles.section}>
          <Text tx="stationAlerts.stations" style={styles.sectionTitle} />
          {alerts.length === 0 ? (
            <Text tx="stationAlerts.noStations" style={styles.empty} />
          ) : (
            <Text tx="stationAlerts.tapToChooseLines" style={styles.empty} preset="small" />
          )}
          {alerts.map((alert) => {
            const station = getStationById(alert.stationId)
            if (!station) return null
            return (
              <StationListItem
                key={alert.stationId}
                title={station.name}
                subtitle={alertSummary(alert)}
                image={station.image}
                onSelect={() => openStation(alert.stationId)}
                onRemove={() => remove(alert.stationId)}
                testID={`station-alert-${alert.stationId}`}
              />
            )
          })}
          <Button
            title={translate("stationAlerts.selectStations") ?? ""}
            onPress={() => router.push("/settings/notifications-stations")}
            testID="station-alerts-select"
          />
        </View>

        {suggested.length > 0 && (
          <View style={styles.section}>
            <Text tx="stationAlerts.fromFavorites" style={styles.sectionTitle} />
            {suggested.map((stationId) => {
              const station = getStationById(stationId)!
              return (
                <StationListItem
                  key={stationId}
                  title={station.name}
                  image={station.image}
                  onSelect={() => add(stationId)}
                  testID={`station-alert-suggested-${stationId}`}
                />
              )
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text tx="delayGuard.settingsTitle" style={styles.sectionTitle} />
          {guards.length === 0 && <Text tx="delayGuard.noGuards" style={styles.empty} />}
          {guards.map((guard) => {
            const origin = getStationById(guard.originStationId)
            return (
              <StationListItem
                key={guardKey(guard)}
                title={translate("delayGuard.train", { trainNumber: guard.trainNumber, time: guard.departureTime }) ?? ""}
                subtitle={`${translate("delayGuard.fromTo", {
                  origin: origin?.name ?? guard.originStationId,
                  destination: getStationById(guard.destinationStationId)?.name ?? guard.destinationStationId,
                })} · ${translate("delayGuard.minutesLate", { minutes: guard.thresholdMinutes })}`}
                image={origin?.image}
                onSelect={() => openGuard(guard)}
                onRemove={() => removeGuard(guard)}
                testID={`delay-guard-${guardKey(guard)}`}
              />
            )
          })}
        </View>

        <Text tx="stationAlerts.note" style={styles.note} preset="small" />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
  },
  content: {
    paddingBottom: theme.spacing[6],
    gap: theme.spacing[4],
  },
  intro: {
    marginTop: theme.spacing[2],
    gap: theme.spacing[2],
  },
  emoji: {
    textAlign: "center",
    fontSize: 56,
  },
  introText: {
    textAlign: "center",
    paddingHorizontal: theme.spacing[3],
  },
  section: {
    gap: theme.spacing[3],
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 17,
  },
  empty: {
    color: theme.colors.label,
  },
  note: {
    textAlign: "center",
    opacity: 0.8,
  },
}))
