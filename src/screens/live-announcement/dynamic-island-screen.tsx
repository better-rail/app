import { Dimensions, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import Video from "react-native-video"
import { Screen, Text } from "@/components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { userLocale } from "@/i18n"
import { useRouter } from "expo-router"
import { NextButton } from "./announcement-next-button"

const deviceHeight = Dimensions.get("screen").height
const isHighDevice = deviceHeight > 820

export function DynamicIslandScreen() {
  const router = useRouter()
  const DYNAMIC_ISLAND_VIDEO =
    userLocale === "he"
      ? require("../../../assets/live-activity/dynamic-island-hebrew.mp4")
      : require("../../../assets/live-activity/dynamic-island-english.mp4")

  return (
    <Screen unsafe={true} statusBar="light-content">
      <LiveAnnouncementBackground />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text tx="liveAnnounce.dynamicIsland.title" preset="header" style={styles.title} maxFontSizeMultiplier={1.1} />
          <Text tx="liveAnnounce.dynamicIsland.description" style={styles.text} maxFontSizeMultiplier={1.1} />
          <Video source={DYNAMIC_ISLAND_VIDEO} style={styles.video} repeat={true} />
          <Text
            tx="liveAnnounce.dynamicIsland.description2"
            style={[styles.text, styles.description2]}
            maxFontSizeMultiplier={1.1}
          />
        </View>

        {isHighDevice && <View style={styles.highDeviceSpacer} />}

        <NextButton
          onPress={() => {
            router.push("/live-announcement/support-us")
          }}
        />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  scrollContent: {
    flex: 1,
    paddingTop: rt.insets.top,
    paddingHorizontal: theme.spacing[5],
  },
  content: {
    marginTop: theme.spacing[3],
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
  description2: {
    marginBottom: theme.spacing[4],
  },
  video: {
    width: rt.screen.height > 820 ? 358 : 330,
    height: rt.screen.height > 820 ? 358 : 330,
    alignSelf: "center",
    marginVertical: theme.spacing[4],
    paddingHorizontal: -24,
    marginHorizontal: -200,
    borderRadius: 12,
  },
  highDeviceSpacer: {
    flex: 0.65,
  },
}))
