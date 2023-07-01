import { Image, ImageStyle, ScrollView, TextStyle, View } from "react-native"
import { Button, Screen, Text } from "../../components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { color, fontScale, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NextButton } from "./announcement-next-button"

const SUB_TITLE: TextStyle = {
  color: color.whiteText,
  fontSize: 20,
  textAlign: "center",
  marginBottom: -4,
  fontWeight: "400",
}

const TITLE: TextStyle = {
  color: color.whiteText,
  fontSize: 42,
  textAlign: "center",
  marginBottom: spacing[2],
  fontWeight: "800",
  letterSpacing: -0.8,
}

const TEXT: TextStyle = {
  fontSize: 18,
  textAlign: "center",
  color: color.whiteText,
}

const LIVE_ACTIVITY_IMAGE: ImageStyle = {
  width: "100%",
  height: 155,
  resizeMode: "contain",
  marginVertical: fontScale > 1.1 ? spacing[4] : spacing[6],
}

export function LiveAnnouncementScreen({ navigation }: LiveAnnouncementStackProps) {
  const insets = useSafeAreaInsets()

  const LIVE_ACTIVITY =
    userLocale === "he"
      ? require("../../../assets/live-activity/live-activity-hebrew.png")
      : require("../../../assets/live-activity/live-activity-english.png")

  return (
    <Screen unsafe={true} statusBar="light-content">
      <LiveAnnouncementBackground />
      <ScrollView
        contentContainerStyle={{
          flex: 1,
          height: "100%",
          paddingTop: insets.top,
          paddingHorizontal: spacing[5],
          paddingBottom: spacing[5],
        }}
      >
        <View style={{ marginTop: spacing[5] }}>
          <Text tx="liveAnnounce.announcement.subtitle" style={SUB_TITLE} maxFontSizeMultiplier={1.1} />
          <Text tx="liveAnnounce.announcement.title" preset="header" style={TITLE} maxFontSizeMultiplier={1.1} />
          <Text tx="liveAnnounce.announcement.description" style={TEXT} maxFontSizeMultiplier={1.15} />
          <View
            style={{
              shadowColor: "#333",
              shadowOffset: { height: 0, width: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
            }}
          >
            <Image source={LIVE_ACTIVITY} style={LIVE_ACTIVITY_IMAGE} />
          </View>
          <Text tx="liveAnnounce.announcement.weMadeAGuide" style={TEXT} maxFontSizeMultiplier={1.1} />
        </View>

        <View style={{ flex: 1 }} />

        <NextButton onPress={() => navigation.navigate("startRide")} />
      </ScrollView>
    </Screen>
  )
}
