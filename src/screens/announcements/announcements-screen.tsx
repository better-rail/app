import { Platform, ScrollView } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text } from "@/components"
import { useIsDarkMode } from "@/hooks"
import { useRouter } from "expo-router"
import { AnnouncementsList } from "@/components/announcements/announcements-list"
import TouchableScale from "react-native-touchable-scale"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "@/models"
import { AnnouncementCard } from "@/components/announcements/announcement-card"
import useServiceUpdates from "./use-service-updates"

export function AnnouncementsScreen() {
  const router = useRouter()
  const { seenNotificationsScreen, setSeenNotificationsScreen } = useSettingsStore(
    useShallow((s) => ({
      seenNotificationsScreen: s.seenNotificationsScreen,
      setSeenNotificationsScreen: s.setSeenNotificationsScreen,
    })),
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
    router.push("/announcements/notifications-setup")
  }

  return (
    <Screen
      style={styles.root}
      preset="fixed"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        {!seenNotificationsScreen && (
          <TouchableScale
            onPress={navigateToNotificationsSetup}
            activeScale={0.97}
            friction={10}
            style={styles.notificationButton}
          >
            <Text tx="announcements.notifications.notificationSettings" style={styles.notificationTitle} />

            <Text tx="announcements.notifications.newButtonContent" style={styles.notificationSubtitle} />
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

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    padding: theme.spacing[3],
    paddingBottom: theme.spacing[5],
  },
  notificationButton: {
    justifyContent: "center",
    height: 100 * rt.fontScale,
    paddingHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[3],
    backgroundColor: "#ffcc00",
    borderRadius: 12,
    shadowColor: theme.colors.palette.black,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.05,
    elevation: 4,
  },
  notificationTitle: {
    textAlign: "center",
    fontSize: 18,
    color: theme.colors.palette.black,
    fontWeight: "500",
  },
  notificationSubtitle: {
    textAlign: "center",
    fontSize: 16,
    color: theme.colors.palette.black,
  },
}))
