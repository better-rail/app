import { Image, ImageStyle, ScrollView, TextStyle, View } from "react-native"
import { Button, Text } from "../../components"
import { color, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"

const TITLE: TextStyle = {
  fontSize: 30,
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: spacing[2],
}
const TEXT: TextStyle = { fontSize: 22, textAlign: "center", lineHeight: 29 }

const LIVE_ACTIVITY_IMAGE: ImageStyle = {
  width: "100%",
  height: 355,
  resizeMode: "contain",
}

const NOTIFICATION_IMAGE_HEBREW = require("../../../assets/live-ride/live-ride-notification.png")
const NOTIFICATION_IMAGE_ENGLISH = require("../../../assets/live-ride/live-ride-notification-english.png")

export function ActivityAnnouncementScreen({ navigation }: LiveAnnouncementStackProps) {
  const NOTIFICATION_IMAGE = userLocale === "he" ? NOTIFICATION_IMAGE_HEBREW : NOTIFICATION_IMAGE_ENGLISH

  return (
    <ScrollView contentContainerStyle={{ height: "100%", paddingTop: spacing[4], backgroundColor: color.tertiaryBackground }}>
      <Text tx="liveAnnounce.liveActivity.androidTitle" preset="header" style={TITLE} maxFontSizeMultiplier={1.1} />
      <View style={{ flex: 1, alignItems: "center", paddingHorizontal: spacing[3], gap: spacing[4] }}>
        <Text tx="liveAnnounce.liveActivity.androidDescription" style={TEXT} maxFontSizeMultiplier={1.1} />

        <Image source={NOTIFICATION_IMAGE} style={LIVE_ACTIVITY_IMAGE} />
        <Text
          tx="liveAnnounce.liveActivity.tip"
          style={[TEXT, { fontSize: 20, marginBottom: spacing[2] }]}
          maxFontSizeMultiplier={1.1}
        />

        <Button
          onPress={() => navigation.navigate("supportUs")}
          containerStyle={{ maxHeight: 60, width: "90%" }}
          title={translate("common.next")}
        />
      </View>
    </ScrollView>
  )
}
