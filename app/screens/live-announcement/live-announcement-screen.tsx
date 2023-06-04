import { Image, ImageStyle, ScrollView, TextStyle, View } from "react-native"
import { Button, Screen, Text } from "../../components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { color, spacing } from "../../theme"
import { translate } from "../../i18n"

const SUB_TITLE: TextStyle = {
  color: color.whiteText,
  fontSize: 20,
  textAlign: "center",
  marginBottom: -4,
  fontWeight: "500",
}

const TITLE: TextStyle = {
  color: color.whiteText,
  fontSize: 42,
  textAlign: "center",
  marginBottom: spacing[2],
  fontWeight: "800",
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
  marginVertical: spacing[6],
}

const LIVE_ACTIVITY = require("../../../assets/live-activity/live-activity-hebrew.png")

export function LiveAnnouncementScreen() {
  return (
    <Screen unsafe={true} statusBar="light-content">
      <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: spacing[5] }}>
        <LiveAnnouncementBackground />

        <View style={{ marginTop: spacing[7] }}>
          <Text tx="liveAnnounce.firstPage.subtitle" style={SUB_TITLE} />
          <Text tx="liveAnnounce.firstPage.title" preset="header" style={TITLE} />
          <Text tx="liveAnnounce.firstPage.description" style={TEXT} />
          <Image source={LIVE_ACTIVITY} style={LIVE_ACTIVITY_IMAGE} />
          <Text tx="liveAnnounce.firstPage.weMadeAGuide" style={TEXT} />
        </View>
        <View style={{ flex: 1 }} />

        <Button title={translate("common.next")} style={{ maxHeight: 60 }} onPress={() => {}} />
      </ScrollView>
    </Screen>
  )
}
