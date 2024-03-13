import { observer } from "mobx-react-lite"
import { Button, Screen, Text } from "../../components"
import { AnnouncementsScreenProps } from "../../navigators/announcements/announcements-navigator"
import { Alert, Linking, ScrollView, View } from "react-native"
import { color, spacing } from "../../theme"
import notifee, { AuthorizationStatus } from "@notifee/react-native"
import { useEffect, useState } from "react"
import { translate } from "../../i18n"
import { useStores } from "../../models"
import { StationListItem } from "./station-list-item"
import { useStations } from "../../data/stations"

export const NotificationsSetupScreen = observer(function NotificationsSetupScreen({ navigation }: AnnouncementsScreenProps) {
  const { settings } = useStores()
  const stations = useStations()

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
    notifee.getNotificationSettings().then((settings) => {
      setNotificationPermission(settings.authorizationStatus === AuthorizationStatus.AUTHORIZED)
    })
  }, [])

  return (
    <Screen style={{ paddingHorizontal: spacing[4], paddingTop: spacing[3], flex: 1, paddingBottom: spacing[5] }} unsafe>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ textAlign: "center", fontSize: 52 }}>🔔</Text>
        <Text style={{ textAlign: "center", marginBottom: spacing[2] }}>
          Receive notifications on unusual updates for your favorite stations.
        </Text>

        {notificationPermission ? (
          <View style={{ flex: 1, gap: 12 }}>
            <Button title="Select Stations" onPress={() => navigation.navigate("notificationsPickStations")} />

            <View style={{ borderBottomWidth: 1, borderColor: color.inputPlaceholderBackground }}>
              <Text style={{ fontWeight: "500" }}>Selected Stations</Text>
            </View>

            {settings.stationsNotifications.map((stationId) => {
              const station = stations.find((s) => s.id === stationId)
              return <StationListItem key={stationId} title={station.name} image={station.image} />
            })}

            <Text style={{ textAlign: "center" }} preset="small">
              Please note: While Better Rail will do its best to provide fast and reliable updates, it is always advisable to
              check with the official sources of Israel Railways as well.
            </Text>
          </View>
        ) : (
          <>
            <Text style={{ textAlign: "center" }}>
              Allow Better Rail to send you notifications related to your favorite stations.
            </Text>
            <Button title="Enable Notifications" onPress={requestPermission} />
          </>
        )}
      </ScrollView>
    </Screen>
  )
})

async function checkApplicationPermission() {
  const settings = await notifee.requestPermission()

  if (settings.authorizationStatus) {
    console.log("User has notification permissions enabled")
  } else {
    console.log("User has notification permissions disabled")
  }

  console.log("iOS settings: ", settings.ios)
}
