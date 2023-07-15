import { Image, ImageStyle, ScrollView, TextStyle, View } from "react-native"
import { Button, Screen, Text } from "../../components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { color, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NextButton } from "./announcement-next-button"

const TITLE: TextStyle = {
  fontSize: 30,
  fontWeight: "bold",
  textAlign: "center",
}
const TEXT: TextStyle = { fontSize: 22, textAlign: "center" }

const LIVE_ACTIVITY_IMAGE: ImageStyle = {
  width: "100%",
  height: 155,
  resizeMode: "contain",
}

export function ActivityAnnouncementScreen({ navigation }: LiveAnnouncementStackProps) {
  const insets = useSafeAreaInsets()
  const LIVE_ACTIVITY =
    userLocale === "he"
      ? require("../../../assets/live-activity/live-activity-delay-hebrew.png")
      : require("../../../assets/live-activity/live-activity-delay-english.png")

  return (
    <ScrollView contentContainerStyle={{ height: "100%", paddingTop: spacing[4], backgroundColor: color.tertiaryBackground }}>
      <View style={{ flex: 1, alignItems: "center", paddingHorizontal: spacing[2] }}>
        <Text tx="liveAnnounce.liveActivity.title" preset="header" style={TITLE} maxFontSizeMultiplier={1.1} />
        <Text tx="liveAnnounce.liveActivity.description" style={TEXT} maxFontSizeMultiplier={1.1} />
        <View
          style={{
            shadowColor: "#333",
            shadowOffset: { height: 0, width: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            marginVertical: spacing[5],
          }}
        >
          <Image source={LIVE_ACTIVITY} style={LIVE_ACTIVITY_IMAGE} />
        </View>
        <Text tx="liveAnnounce.liveActivity.tip" style={TEXT} maxFontSizeMultiplier={1.1} />
      </View>

      <View style={{ flex: 1 }} />

      <Button
        onPress={() => navigation.navigate("liveActivity")}
        containerStyle={{ maxHeight: 60, width: "90%" }}
        title={translate("common.next")}
      />
    </ScrollView>
  )
}
