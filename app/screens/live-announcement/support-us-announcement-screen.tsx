import { Image, ImageStyle, ScrollView, TextStyle, View } from "react-native"
import { Button, Screen, Text } from "../../components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { color, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"

const SUB_TITLE: TextStyle = {
  color: color.whiteText,
  fontSize: 20,
  textAlign: "center",
  marginBottom: -4,
  fontWeight: "400",
}

const TITLE: TextStyle = {
  color: color.whiteText,
  fontSize: 30,
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
  marginVertical: spacing[6],
}

export function SupportUsScreen({ navigation }: LiveAnnouncementStackProps) {
  const LIVE_ACTIVITY =
    userLocale === "he"
      ? require("../../../assets/live-activity/live-activity-hebrew.png")
      : require("../../../assets/live-activity/live-activity-english.png")

  return (
    <Screen unsafe={true} statusBar="light-content">
      <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: spacing[5] }}>
        <LiveAnnouncementBackground />

        <View style={{ marginTop: spacing[6] }}>
          <Text tx="liveAnnounce.supportUs.title" preset="header" style={TITLE} />

          <View style={{ gap: spacing[4] }}>
            <Text tx="liveAnnounce.supportUs.description1" style={TEXT} />
            <Text tx="liveAnnounce.supportUs.description2" style={TEXT} />
            <View>
              <Text tx="liveAnnounce.supportUs.description3" style={TEXT} />
              <Text tx="liveAnnounce.supportUs.description4" style={TEXT} />
            </View>
            <Text tx="liveAnnounce.supportUs.description5" style={TEXT} />
            <Text tx="liveAnnounce.supportUs.description6" style={TEXT} />
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <Button
          title={translate("common.next")}
          style={{ maxHeight: 60 }}
          onPress={() => {
            navigation.navigate("startRide")
          }}
        />
      </ScrollView>
    </Screen>
  )
}
