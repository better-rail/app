import { Dimensions, ImageStyle, ScrollView, TextStyle, View } from "react-native"
import Video from "react-native-video"
import { Button, Screen, Text } from "../../components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { color, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NextButton } from "./announcement-next-button"

const deviceHeight = Dimensions.get("screen").height
const isHighDevice = deviceHeight > 820

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

const VIDEO_STYLE: ImageStyle = {
  width: isHighDevice ? 358 : 330,
  height: isHighDevice ? 358 : 330,
  alignSelf: "center",
  marginVertical: spacing[4],
  paddingHorizontal: -24,
  marginHorizontal: -200,
  borderRadius: 12,
}

export function DynamicIslandScreen({ navigation }: LiveAnnouncementStackProps) {
  const insets = useSafeAreaInsets()
  const DYNAMIC_ISLAND_VIDEO =
    userLocale === "he"
      ? require("../../../assets/live-activity/dynamic-island-hebrew.mp4")
      : require("../../../assets/live-activity/dynamic-island-english.mp4")

  return (
    <Screen unsafe={true} statusBar="light-content">
      <LiveAnnouncementBackground />
      <ScrollView contentContainerStyle={{ flex: 1, paddingTop: insets.top, paddingHorizontal: spacing[5] }}>
        <View style={{ marginTop: spacing[3] }}>
          <Text tx="liveAnnounce.dynamicIsland.title" preset="header" style={TITLE} maxFontSizeMultiplier={1.1} />
          <Text tx="liveAnnounce.dynamicIsland.description" style={TEXT} maxFontSizeMultiplier={1.1} />
          <Video source={DYNAMIC_ISLAND_VIDEO} style={VIDEO_STYLE} repeat={true} />
          <Text
            tx="liveAnnounce.dynamicIsland.description2"
            style={[TEXT, { marginBottom: spacing[4] }]}
            maxFontSizeMultiplier={1.1}
          />
        </View>

        {isHighDevice && <View style={{ flex: 0.65 }} />}

        <NextButton
          onPress={() => {
            navigation.navigate("supportUs")
          }}
        />
      </ScrollView>
    </Screen>
  )
}
