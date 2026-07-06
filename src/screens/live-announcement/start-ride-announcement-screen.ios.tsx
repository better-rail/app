import { ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import Video from "react-native-video"
import { Screen, Text } from "@/components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { translate, userLocale } from "@/i18n"
import { useRouter } from "expo-router"
import { NextButton } from "./announcement-next-button"

export function StartRideAnnouncement() {
  const router = useRouter()

  const START_RIDE_VIDEO =
    userLocale === "he"
      ? require("../../../assets/live-activity/start-ride-hebrew.mp4")
      : require("../../../assets/live-activity/start-ride-english.mp4")
  return (
    <Screen unsafe={true} statusBar="light-content">
      <LiveAnnouncementBackground />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text tx="liveAnnounce.startRide.title" preset="header" style={styles.title} maxFontSizeMultiplier={1.1} />
          <Text tx="liveAnnounce.startRide.description" style={styles.text} maxFontSizeMultiplier={1.1} />
          <View style={styles.videoWrapper}>
            <Video source={START_RIDE_VIDEO} style={styles.video} repeat={true} />
          </View>
          <Text
            tx="liveAnnounce.startRide.description2"
            style={[styles.text, styles.description2]}
            maxFontSizeMultiplier={1.1}
          />
        </View>

        <NextButton
          title={translate("common.next") ?? undefined}
          onPress={() => {
            router.push("/live-announcement/live-activity")
          }}
        />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => {
  const deviceHeight = rt.screen.height
  const isHighDevice = deviceHeight > 800
  const isVeryHighDevice = deviceHeight > 840

  return {
    scrollContent: {
      paddingTop: rt.insets.top,
      paddingHorizontal: theme.spacing[5],
      paddingBottom: 20,
    },
    content: {
      marginTop: theme.spacing[4],
    },
    title: {
      color: theme.colors.whiteText,
      fontSize: 42,
      textAlign: "center",
      fontWeight: "800",
    },
    text: {
      fontSize: 18,
      textAlign: "center",
      color: theme.colors.whiteText,
    },
    videoWrapper: {
      shadowColor: "#333",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    video: {
      width: isVeryHighDevice ? 317 : isHighDevice ? 287 : 230,
      height: isVeryHighDevice ? 420 : isHighDevice ? 380 : 305,
      alignSelf: "center",
      marginVertical: theme.spacing[4],
      borderRadius: 12,
    },
    description2: {
      marginBottom: theme.spacing[4],
    },
  }
})
