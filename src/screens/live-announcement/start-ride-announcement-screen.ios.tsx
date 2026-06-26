import { Dimensions, ImageStyle, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import Video from "react-native-video"
import { Screen, Text } from "../../components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { color, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NextButton } from "./announcement-next-button"

const deviceHeight = Dimensions.get("screen").height
const isHighDevice = deviceHeight > 800
const isVeryHighDevice = deviceHeight > 840

const TITLE: TextStyle = {
  color: color.whiteText,
  fontSize: 42,
  textAlign: "center",
  fontWeight: "800",
}

const TEXT: TextStyle = {
  fontSize: 18,
  textAlign: "center",
  color: color.whiteText,
}

const VIDEO_WRAPPER: ViewStyle = {
  shadowColor: "#333",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
}

const VIDEO_STYLE: ImageStyle = {
  width: isVeryHighDevice ? 317 : isHighDevice ? 287 : 230,
  height: isVeryHighDevice ? 420 : isHighDevice ? 380 : 305,
  alignSelf: "center",
  marginVertical: spacing[4],
  borderRadius: 12,
}

export function StartRideAnnouncement() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const START_RIDE_VIDEO =
    userLocale === "he"
      ? require("../../../assets/live-activity/start-ride-hebrew.mp4")
      : require("../../../assets/live-activity/start-ride-english.mp4")
  return (
    <Screen unsafe={true} statusBar="light-content">
      <LiveAnnouncementBackground />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: spacing[5], paddingBottom: 20 }}>
        <View style={{ marginTop: spacing[4] }}>
          <Text tx="liveAnnounce.startRide.title" preset="header" style={TITLE} maxFontSizeMultiplier={1.1} />
          <Text tx="liveAnnounce.startRide.description" style={TEXT} maxFontSizeMultiplier={1.1} />
          <View style={VIDEO_WRAPPER}>
            <Video source={START_RIDE_VIDEO} style={VIDEO_STYLE} repeat={true} />
          </View>
          <Text
            tx="liveAnnounce.startRide.description2"
            style={[TEXT, { marginBottom: spacing[4] }]}
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
