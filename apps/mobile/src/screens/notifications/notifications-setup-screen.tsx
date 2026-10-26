import { Linking, Pressable, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Path, Svg } from "react-native-svg"
import { useRouter } from "expo-router"
import { useShallow } from "zustand/react/shallow"
import HapticFeedback from "react-native-haptic-feedback"
import { Button, Screen, Text } from "@/components"
import type { ContextMenuAction } from "@/components/context-menu/context-menu"
import { translate } from "@/i18n"
import { getStationById, stationName } from "@/data/stations"
import { type DelayGuard, type StationAlert, useFavoritesStore, useSettingsStore } from "@/models"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { guardKey } from "@/services/api"
import { trackEvent } from "@/services/analytics"
import { usePushPermission } from "@/hooks"
import { DELAY_GUARD_CHANNEL, STATION_ALERTS_CHANNEL } from "@/utils/push-channels"
import { usePushSyncStatus } from "@/utils/push-subscription-sync"
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

/** "Train 407 · 09:08 · 10 min late": the train, when it leaves, and from how late the rider hears. */
export const guardSummary = (guard: DelayGuard): string =>
  `${translate("delayGuard.train", { trainNumber: guard.trainNumber, time: guard.departureTime })} · ${translate(
    "delayGuard.minutesLate",
    { minutes: guard.thresholdMinutes },
  )}`

/**
 * The station notifications page in the settings: the permission when it is still to be given, the
 * stations being followed (tap one to choose its lines and days), suggestions from the favourite
 * routes, the way to add more, and the trains watched for delays. Each row's edit button opens a
 * menu of what can be changed about it.
 */
export function NotificationsSetupScreen() {
  const router = useRouter()
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
  const { permission, ensure } = usePushPermission()
  // A muted Android channel of either feature, while the app's own permission is on.
  const stationsPermission = usePushPermission(STATION_ALERTS_CHANNEL).permission
  const guardsPermission = usePushPermission(DELAY_GUARD_CHANNEL).permission
  const syncStatus = usePushSyncStatus()
  const syncFailed = Object.values(syncStatus).includes("failed")
  const syncOffline = !syncFailed && Object.values(syncStatus).includes("offline")

  const requestPermission = () =>
    ensure("settings", { title: "stationAlerts.settingsTitle", message: "stationAlerts.permissionDenied" })

  const hasItems = alerts.length > 0 || guards.length > 0
  const appAllowed = permission === "granted"
  const stationsMuted = appAllowed && stationsPermission !== undefined && stationsPermission !== "granted"
  const guardsMuted = appAllowed && guardsPermission !== undefined && guardsPermission !== "granted"

  const openStation = (stationId: string) => {
    HapticFeedback.trigger("impactLight")
    router.push({ pathname: "/settings/notifications-station", params: { stationId } })
  }

  const remove = (stationId: string) => {
    HapticFeedback.trigger("impactLight")
    trackEvent("station_alert_disabled", { stationId, source: "settings" })
    removeStationAlert(stationId)
  }

  const add = async (stationId: string) => {
    HapticFeedback.trigger("impactLight")
    // Asked before the station is added, as the station card does.
    if (!(await ensure("favorites", { title: "stationAlerts.settingsTitle", message: "stationAlerts.permissionDenied" }))) return
    trackEvent("station_alert_enabled", { stationId, source: "favorites" })
    setStationAlert(stationId)
  }

  const openGuard = (guard: DelayGuard) => {
    HapticFeedback.trigger("impactLight")
    useNavigationParamsStore.getState().setDelayGuardDraft(guard)
    router.push("/settings/notifications-train")
  }

  const removeGuard = (guard: DelayGuard) => {
    HapticFeedback.trigger("impactLight")
    trackEvent("delay_guard_disabled", { trainNumber: guard.trainNumber, source: "settings" })
    removeDelayGuard(guardKey(guard))
  }

  const stationActions = (stationId: string): ContextMenuAction[] => [
    { title: translate("stationAlerts.chooseLines") ?? "", systemIcon: "tram", onPress: () => openStation(stationId) },
    { title: translate("stationAlerts.remove") ?? "", systemIcon: "trash", destructive: true, onPress: () => remove(stationId) },
  ]

  const guardActions = (guard: DelayGuard): ContextMenuAction[] => [
    { title: translate("delayGuard.changeThreshold") ?? "", systemIcon: "clock.badge", onPress: () => openGuard(guard) },
    { title: translate("stationAlerts.remove") ?? "", systemIcon: "trash", destructive: true, onPress: () => removeGuard(guard) },
  ]

  // Stations of the favourite routes not followed yet, as suggestions.
  const followed = new Set(alerts.map((a) => a.stationId))
  const suggested = [...new Set(favoriteRoutes.flatMap((route) => [route.originId, route.destinationId]))].filter(
    (id) => !followed.has(id) && getStationById(id),
  )

  return (
    <Screen style={styles.screen} unsafe>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text
          tx={
            appAllowed || permission === undefined
              ? "stationAlerts.setupContent"
              : hasItems
                ? "stationAlerts.offWarning"
                : "stationAlerts.requestPermission"
          }
          style={[styles.intro, !appAllowed && permission !== undefined && hasItems && styles.warning]}
        />

        {permission !== undefined && permission !== "granted" && (
          <Button
            title={translate(permission === "denied" ? "stationAlerts.openSettings" : "stationAlerts.enableNotifications") ?? ""}
            onPress={permission === "denied" ? () => Linking.openSettings() : requestPermission}
            testID="station-alerts-enable"
          />
        )}

        {appAllowed && syncFailed && (
          <Text tx="stationAlerts.syncFailed" style={[styles.status, styles.warning]} preset="small" testID="push-sync-failed" />
        )}
        {appAllowed && syncOffline && (
          <Text tx="stationAlerts.syncOffline" style={styles.status} preset="small" testID="push-sync-offline" />
        )}

        <View style={styles.section}>
          <Text tx="stationAlerts.stations" style={styles.sectionTitle} accessibilityRole="header" />
          {stationsMuted && alerts.length > 0 && <MutedNotice tx="stationAlerts.channelMuted" testID="station-alerts-muted" />}
          {alerts.length === 0 && <Text tx="stationAlerts.noStations" style={styles.empty} preset="small" />}
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
                actions={stationActions(alert.stationId)}
                testID={`station-alert-${alert.stationId}`}
              />
            )
          })}
          <AddRow
            label={translate("stationAlerts.selectStations") ?? ""}
            onPress={() => router.push("/settings/notifications-stations")}
            testID="station-alerts-select"
          />
          {alerts.length > 0 && <Text tx="stationAlerts.tapToChooseLines" style={styles.footnote} preset="small" />}
        </View>

        {suggested.length > 0 && (
          <View style={styles.section}>
            <Text tx="stationAlerts.fromFavorites" style={styles.sectionTitle} accessibilityRole="header" />
            {suggested.map((stationId) => {
              const station = getStationById(stationId)!
              return (
                <StationListItem
                  key={stationId}
                  title={station.name}
                  image={station.image}
                  onSelect={() => void add(stationId)}
                  testID={`station-alert-suggested-${stationId}`}
                />
              )
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text tx="delayGuard.settingsTitle" style={styles.sectionTitle} accessibilityRole="header" />
          {guardsMuted && guards.length > 0 && <MutedNotice tx="delayGuard.channelMuted" testID="delay-guards-muted" />}
          {guards.length === 0 && <Text tx="delayGuard.noGuards" style={styles.empty} preset="small" />}
          {guards.map((guard) => {
            const origin = getStationById(guard.originStationId)
            return (
              <StationListItem
                key={guardKey(guard)}
                title={`${origin?.name ?? guard.originStationId}\n${translate("common.toStationName", {
                  stationName: stationName(guard.destinationStationId),
                })}`}
                titleLines={2}
                subtitle={guardSummary(guard)}
                image={origin?.image}
                onSelect={() => openGuard(guard)}
                actions={guardActions(guard)}
                testID={`delay-guard-${guardKey(guard)}`}
              />
            )
          })}
        </View>

        <Text tx="stationAlerts.note" style={styles.footnote} preset="small" />
      </ScrollView>
    </Screen>
  )
}

/** The way to add stations: a row among the rows, with a plus where a station's photo would be. */
function AddRow({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.addRow, pressed && styles.addRowPressed]}
      testID={testID}
    >
      <View style={styles.addBadge}>
        <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
          <Path d="M12 5v14M5 12h14" stroke="#007AFF" strokeWidth={2.5} strokeLinecap="round" />
        </Svg>
      </View>
      <Text style={styles.addLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

/** A feature's own notifications are muted in the device settings: say so, with the way there. */
function MutedNotice({ tx, testID }: { tx: "stationAlerts.channelMuted" | "delayGuard.channelMuted"; testID: string }) {
  return (
    <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button" testID={testID}>
      <Text tx={tx} style={styles.warning} preset="small" />
      <Text tx="stationAlerts.openSettings" style={styles.link} preset="small" />
    </Pressable>
  )
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
  },
  content: {
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[6],
    gap: theme.spacing[5],
  },
  intro: {
    fontSize: 15,
    color: theme.colors.label,
    paddingHorizontal: theme.spacing[1],
  },
  section: {
    gap: theme.spacing[3],
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.label,
    paddingHorizontal: theme.spacing[1],
  },
  empty: {
    color: theme.colors.label,
    paddingHorizontal: theme.spacing[1],
  },
  footnote: {
    color: theme.colors.label,
    paddingHorizontal: theme.spacing[1],
  },
  status: {
    color: theme.colors.label,
    paddingHorizontal: theme.spacing[1],
  },
  warning: {
    color: theme.colors.error,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: theme.colors.secondaryBackground,
    shadowColor: "#333",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  addRowPressed: {
    opacity: 0.7,
  },
  addBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.inputPlaceholderBackground,
  },
  addLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: "500",
    color: theme.colors.primary,
  },
}))
