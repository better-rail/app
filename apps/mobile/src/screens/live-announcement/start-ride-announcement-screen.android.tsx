import { ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import Video from "react-native-video"
import { Button, Text } from "@/components"
import { translate, userLocale } from "@/i18n"
import { useRouter } from "expo-router"

const START_RIDE_VIDEO_HEBREW = require("../../../assets/live-ride/start-live-ride.mp4")
const START_RIDE_VIDEO_ENGLISH = require("../../../assets/live-ride/start-live-ride-english.mp4")

export function StartRideAnnouncement() {
  const router = useRouter()
  const START_RIDE_VIDEO = userLocale === "he" ? START_RIDE_VIDEO_HEBREW : START_RIDE_VIDEO_ENGLISH

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text tx="liveAnnounce.startRide.title" preset="header" style={styles.title} maxFontSizeMultiplier={1.1} />
        <Text tx="liveAnnounce.startRide.description" style={styles.text} maxFontSizeMultiplier={1.1} />

        <Video source={START_RIDE_VIDEO} style={styles.video} repeat={true} />

        <Text tx="liveAnnounce.startRide.description2" style={[styles.text, styles.description2]} maxFontSizeMultiplier={1.1} />
        <Button onPress={() => router.push("/live-announcement/live-activity")} title={translate("common.next") ?? ""} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: theme.colors.tertiaryBackground,
  },
  scrollContent: {
    paddingTop: theme.spacing[7] + 4,
    paddingBottom: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
    backgroundColor: theme.colors.tertiaryBackground,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
  },
  text: {
    fontSize: 22,
    textAlign: "center",
  },
  video: {
    width: "100%",
    aspectRatio: 1,
    marginVertical: theme.spacing[4],
    borderRadius: 8,
  },
  description2: {
    marginBottom: theme.spacing[4],
  },
}))
