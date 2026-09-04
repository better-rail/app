import { Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text } from "@/components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { userLocale } from "@/i18n"
import { useRouter } from "expo-router"
import { NextButton } from "./announcement-next-button"
import { LiveAnnouncementScrollView } from "./live-announcement-scroll-view"

export function LiveAnnouncementScreen() {
  const router = useRouter()

  const LIVE_ACTIVITY =
    userLocale === "he"
      ? require("../../../assets/live-activity/live-activity-hebrew.png")
      : require("../../../assets/live-activity/live-activity-english.png")

  return (
    <Screen unsafe={true} statusBar="light-content">
      <LiveAnnouncementBackground />
      <LiveAnnouncementScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text tx="liveAnnounce.announcement.subtitle" style={styles.subTitle} maxFontSizeMultiplier={1.1} />
          <Text tx="liveAnnounce.announcement.title" preset="header" style={styles.title} maxFontSizeMultiplier={1.1} />
          <Text tx="liveAnnounce.announcement.description" style={styles.text} maxFontSizeMultiplier={1.15} />
          <View style={styles.imageWrapper}>
            <Image source={LIVE_ACTIVITY} style={styles.liveActivityImage} />
          </View>
          <Text tx="liveAnnounce.announcement.weMadeAGuide" style={styles.text} maxFontSizeMultiplier={1.1} />
        </View>

        <View style={styles.spacer} />

        <NextButton onPress={() => router.push("/live-announcement/start-ride")} />
      </LiveAnnouncementScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  scrollContent: {
    flex: 1,
    height: "100%",
    paddingTop: rt.insets.top,
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[5],
  },
  content: {
    marginTop: theme.spacing[5],
  },
  subTitle: {
    color: theme.colors.whiteText,
    fontSize: 20,
    textAlign: "center",
    marginBottom: -4,
    fontWeight: "400",
  },
  title: {
    color: theme.colors.whiteText,
    fontSize: 42,
    textAlign: "center",
    marginBottom: theme.spacing[2],
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  text: {
    fontSize: 18,
    textAlign: "center",
    color: theme.colors.whiteText,
  },
  imageWrapper: {
    shadowColor: "#333",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  liveActivityImage: {
    width: "100%",
    height: 155,
    resizeMode: "contain",
    marginVertical: rt.fontScale > 1.1 ? theme.spacing[4] : theme.spacing[6],
  },
  spacer: {
    flex: 0.9,
  },
}))
