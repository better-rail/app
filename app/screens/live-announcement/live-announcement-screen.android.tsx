import { Image, ImageStyle, ScrollView, StatusBar, TextStyle, View } from "react-native"
import { Button, Screen, Text } from "../../components"
import { color, fontScale, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NextButton } from "./announcement-next-button"

const SUB_TITLE: TextStyle = { fontSize: 24, textAlign: "center" }
const TITLE: TextStyle = { fontSize: 30, fontWeight: "bold", textAlign: "center" }
const TEXT: TextStyle = { fontSize: 22, textAlign: "center" }

export function LiveAnnouncementScreen({ navigation }: LiveAnnouncementStackProps) {
  const insets = useSafeAreaInsets()

  const LIVE_IMAGE =
    userLocale === "he"
      ? require("../../../assets/live-activity/live-activity-hebrew.png")
      : require("../../../assets/live-activity/live-activity-english.png")

  return (
    <ScrollView contentContainerStyle={{ height: "100%", paddingTop: spacing[8], backgroundColor: color.tertiaryBackground }}>
      <View style={{ height: "100%", flex: 1, alignItems: "center", paddingHorizontal: spacing[2] }}>
        <Text tx="liveAnnounce.announcement.subtitle" style={SUB_TITLE} />
        <Text tx="liveAnnounce.announcement.title" style={TITLE} />
        {/* image goes here */}
        <Text tx="liveAnnounce.announcement.description" style={TEXT} />
      </View>
    </ScrollView>
  )
}
