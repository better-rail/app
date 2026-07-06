import { Button, Screen, Text } from "@/components"
import { useRouter } from "expo-router"
import { Alert, Linking, Platform, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import notifee, { AuthorizationStatus } from "@notifee/react-native"
import { useEffect, useState } from "react"
import { translate, userLocale } from "@/i18n"
import { useSettingsStore, useFavoritesStore } from "@/models"
import { StationListItem } from "./station-list-item"
import { useStations } from "@/data/stations"
import { trackEvent } from "@/services/analytics"
import { messaging } from "@/services/firebase/messaging"
import { useAppState, useIsDarkMode } from "@/hooks"
import { chain } from "lodash"

export function NotificationsSetupScreen() {
  const router = useRouter()
  const stationsNotifications = useSettingsStore((s) => s.stationsNotifications)
  const favoriteRoutesData = useFavoritesStore((s) => s.routes)
  const stations = useStations()
  const appState = useAppState()
  const [notificationPermission, setNotificationPermission] = useState(false)

  const isDarkMode = useIsDarkMode()

  const requestPermission = async () => {
    const settings = await notifee.requestPermission()

    if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
      trackEvent("notification_permission_granted")
      setNotificationPermission(true)
    } else {
      Alert.alert(
        "Permission denied",
        "You have denied the permission to receive notifications. You can enable it in the settings.",
        [
          {
            style: "cancel",
            text: translate("common.cancel"),
          },
          {
            text: translate("settings.title"),
            onPress: () => Linking.openSettings(),
          },
        ],
      )
    }
  }

  useEffect(() => {
    if (appState === "active") {
      notifee.getNotificationSettings().then((settings) => {
        setNotificationPermission(settings.authorizationStatus === AuthorizationStatus.AUTHORIZED)
      })
    }
  }, [appState])

  useEffect(() => {
    if (notificationPermission) {
      let topicName = `service-updates-${userLocale}`

      if (__DEV__) {
        topicName = `service-updates-test-${userLocale}`
      }

      messaging.subscribeToTopic(topicName).then(() => {
        console.log("Subscribed to service updates")
      })
    }
  }, [notificationPermission])

  const favoriteStations = chain(favoriteRoutesData)
    .flatMap((route) => [route.originId, route.destinationId])
    .uniq()
    .filter((station) => !stationsNotifications.includes(station))
    .value()

  return (
    <Screen style={styles.screen} unsafe statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"} translucent>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          <View style={styles.emojiWrapper}>
            <Text style={styles.emoji}>🔔</Text>
            {notificationPermission && (
              <Text tx="announcements.notifications.notificationSetupContent" style={styles.setupContent} />
            )}
          </View>

          {notificationPermission ? (
            <View style={styles.permissionGrantedWrapper}>
              {favoriteStations.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text tx="announcements.notifications.stationsFromFavorites" style={styles.sectionHeaderText} />
                </View>
              )}

              {favoriteStations.map((stationId) => {
                const station = stations.find((s) => s.id === stationId)
                return <StationListItem key={stationId} title={station.name} image={station.image} />
              })}

              {stationsNotifications.length > 0 && (
                <View style={styles.sectionHeaderRow}>
                  <Text
                    tx={
                      favoriteStations.length > 0
                        ? "announcements.notifications.selectedStations"
                        : "announcements.notifications.stations"
                    }
                    style={styles.sectionHeaderText}
                  />
                </View>
              )}

              {stationsNotifications.map((stationId) => {
                const station = stations.find((s) => s.id === stationId)
                return <StationListItem key={stationId} title={station.name} image={station.image} />
              })}

              <Button
                variant="primary"
                title={translate("announcements.notifications.selectStations")}
                onPress={() => router.push("/announcements/notifications-stations")}
              />

              <Text tx="announcements.notifications.notificationNote" style={styles.note} preset="small" />
            </View>
          ) : (
            <View style={styles.requestPermissionWrapper}>
              <Text tx="announcements.notifications.requestPermissionContent" style={styles.requestPermissionText} />

              <Button
                title={translate("announcements.notifications.enableNotifications")}
                onPress={requestPermission}
                variant="primary"
              />
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    paddingHorizontal: theme.spacing[4],
    flex: 1,
  },
  contentWrapper: {
    paddingBottom: theme.spacing[6],
  },
  emojiWrapper: {
    marginVertical: theme.spacing[2],
    gap: theme.spacing[2],
  },
  emoji: {
    textAlign: "center",
    fontSize: 56,
  },
  setupContent: {
    textAlign: "center",
    paddingHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  permissionGrantedWrapper: {
    flex: 1,
    gap: 12,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderColor: Platform.select({ ios: theme.colors.separator, android: "lightgrey" }),
  },
  sectionHeaderRow: {
    flex: 1,
    flexDirection: "row",
    borderBottomWidth: 1,
    justifyContent: "space-between",
    borderColor: Platform.select({ ios: theme.colors.separator, android: "lightgrey" }),
  },
  sectionHeaderText: {
    fontWeight: "500",
  },
  note: {
    textAlign: "center",
    opacity: 0.8,
  },
  requestPermissionWrapper: {
    gap: 16,
  },
  requestPermissionText: {
    textAlign: "center",
  },
}))
