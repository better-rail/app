import { Platform, ScrollView, ViewStyle } from "react-native"
import { Screen, Text } from "../../components"
import { color, fontScale, spacing } from "../../theme"
import { useIsDarkMode } from "../../hooks"
import { AnnouncementsScreenProps } from "../../navigators/announcements/announcements-navigator"
import { AnnouncementsList } from "../../components/announcements/announcements-list"
import TouchableScale from "react-native-touchable-scale"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "../../models"
import { AnnouncementCard } from "../../components/announcements/announcement-card"
import useServiceUpdates from "./use-service-updates"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
}

const SCROLL_VIEW: ViewStyle = {
  padding: spacing[3],
  paddingBottom: spacing[5],
}

const NOTIFICATION_BUTTON: ViewStyle = {
  justifyContent: "center",
  height: 100 * fontScale,
  paddingHorizontal: spacing[3],
  marginBottom: spacing[3],
  backgroundColor: "#ffcc00",
  borderRadius: 12,
  shadowColor: color.palette.black,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.05,
  elevation: 4,
}

export function AnnouncementsScreen({ navigation }: AnnouncementsScreenProps) {
  const { seenNotificationsScreen, setSeenNotificationsScreen } = useSettingsStore(
    useShallow((s) => ({ seenNotificationsScreen: s.seenNotificationsScreen, setSeenNotificationsScreen: s.setSeenNotificationsScreen }))
  )
  const { data: serviceUpdates } = useServiceUpdates()

  const isDarkMode = useIsDarkMode()

  const navigateToNotificationsSetup = () => {
    if (!seenNotificationsScreen) {
      setTimeout(() => {
        // avoid flickering until the next screen is fully loaded
        setSeenNotificationsScreen(true)
      }, 1250)
    }
    navigation.navigate("notificationsSetup")
  }

  return (
    <Screen
      style={ROOT}
      preset="fixed"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <ScrollView contentContainerStyle={SCROLL_VIEW}>
        {!seenNotificationsScreen && (
          <TouchableScale onPress={navigateToNotificationsSetup} activeScale={0.97} friction={10} style={NOTIFICATION_BUTTON}>
            <Text
              tx="announcements.notifications.notificationSettings"
              style={{ textAlign: "center", fontSize: 18, color: color.palette.black, fontWeight: "500" }}
            />

            <Text
              tx="announcements.notifications.newButtonContent"
              style={{ textAlign: "center", fontSize: 16, color: color.palette.black }}
            />
          </TouchableScale>
        )}

        {serviceUpdates?.map(({ title, body, link }, index) => (
          <AnnouncementCard key={index} title={title} body={body} link={link} type="notification" />
        ))}

        <AnnouncementsList updatesType="regular" />
      </ScrollView>
    </Screen>
  )
}
