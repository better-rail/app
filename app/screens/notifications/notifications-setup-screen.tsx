import { observer } from "mobx-react-lite"
import { Button, Screen, Text } from "../../components"
import { AnnouncementsScreenProps } from "../../navigators/announcements/announcements-navigator"
import { Alert, Linking, Platform, ScrollView, View } from "react-native"
import { color, spacing } from "../../theme"
import notifee, { AuthorizationStatus } from "@notifee/react-native"
import { useEffect, useState } from "react"
import { translate, userLocale } from "../../i18n"
import { useStores } from "../../models"
import { StationListItem } from "./station-list-item"
import { useStations } from "../../data/stations"
import messaging from "@react-native-firebase/messaging"
import { useAppState } from "../../hooks"

export const NotificationsSetupScreen = observer(function NotificationsSetupScreen({ navigation }: AnnouncementsScreenProps) {
  const { settings } = useStores()
  const stations = useStations()
  const appState = useAppState()
  const [notificationPermission, setNotificationPermission] = useState(false)

  const requestPermission = async () => {
    const settings = await notifee.requestPermission()

    if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED) {
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

      messaging()
        .subscribeToTopic(topicName)
        .then(() => {
          console.log("Subscribed to service updates")
        })
    }
  }, [notificationPermission])

  return (
    <Screen style={{ paddingHorizontal: spacing[4], flex: 1, paddingBottom: spacing[5] }} unsafe>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ marginVertical: spacing[2], gap: spacing[2] }}>
          <Text style={{ textAlign: "center", fontSize: 56 }}>🔔</Text>
          <Text
            tx="announcements.notifications.notificationSetupContent"
            style={{ textAlign: "center", paddingHorizontal: spacing[3], marginBottom: spacing[2] }}
          />
        </View>

        {notificationPermission ? (
          <View style={{ flex: 1, gap: 12 }}>
            <Button
              title={translate("announcements.notifications.selectStations")}
              onPress={() => navigation.navigate("notificationsPickStations")}
            />

            {settings.stationsNotifications.length > 0 && (
              <View
                style={{ borderBottomWidth: 1, borderColor: Platform.select({ ios: color.separator, android: "lightgrey" }) }}
              >
                <Text tx="announcements.notifications.selectedStations" style={{ fontWeight: "500" }} />
              </View>
            )}

            {settings.stationsNotifications.map((stationId) => {
              const station = stations.find((s) => s.id === stationId)
              return <StationListItem key={stationId} title={station.name} image={station.image} />
            })}

            <Text
              tx="announcements.notifications.notificationNote"
              style={{ textAlign: "center", opacity: 0.8 }}
              preset="small"
            />
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <Text tx="announcements.notifications.requestPermissionContent" style={{ textAlign: "center" }} />

            <Button title={translate("announcements.notifications.enableNotifications")} onPress={requestPermission} />
          </View>
        )}
      </ScrollView>
    </Screen>
  )
})
