import { Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text } from "@/components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { userLocale } from "@/i18n"
import { useRouter } from "expo-router"
import { NextButton } from "./announcement-next-button"
import { LiveAnnouncementScrollView } from "./live-announcement-scroll-view"

export function ActivityAnnouncementScreen() {
  const router = useRouter()
  const LIVE_ACTIVITY =
    userLocale === "he"
      ? require("../../../assets/live-activity/live-activity-delay-hebrew.png")
      : require("../../../assets/live-activity/live-activity-delay-english.png")

  return (
    <Screen unsafe={true} statusBar="light-content">
      <LiveAnnouncementBackground />
      <LiveAnnouncementScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text tx="liveAnnounce.liveActivity.title" preset="header" style={styles.title} maxFontSizeMultiplier={1.1} />
          <Text tx="liveAnnounce.liveActivity.description" style={styles.text} maxFontSizeMultiplier={1.1} />
          <View style={styles.imageShadow}>
            <Image source={LIVE_ACTIVITY} style={styles.liveActivityImage} />
          </View>
          <Text tx="liveAnnounce.liveActivity.tip" style={styles.text} maxFontSizeMultiplier={1.1} />
        </View>

        <View style={styles.spacer} />

        <NextButton
          onPress={() => {
            router.push("/live-announcement/dynamic-island")
          }}
        />
      </LiveAnnouncementScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  scrollContent: {
    height: "100%",
    paddingTop: rt.insets.top,
    paddingHorizontal: theme.spacing[5],
    paddingBottom: rt.insets.bottom + 15,
  },
  content: {
    marginTop: theme.spacing[4],
  },
  title: {
    color: theme.colors.whiteText,
    fontSize: 42,
    textAlign: "center",
    marginBottom: theme.spacing[2],
    fontWeight: "800",
  },
  text: {
    fontSize: 18,
    textAlign: "center",
    color: theme.colors.whiteText,
  },
  imageShadow: {
    shadowColor: "#333",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginVertical: theme.spacing[5],
  },
  liveActivityImage: {
    width: "100%",
    height: 155,
    resizeMode: "contain",
  },
  spacer: {
    flex: 1,
  },
}))
