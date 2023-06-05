import { Dimensions, ImageStyle, ScrollView, TextStyle, View } from "react-native"
import Video from "react-native-video"
import { Button, Screen, Text } from "../../components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { color, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"

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
  width: isHighDevice ? 300 : 275,
  height: isHighDevice ? 399 : 365,
  alignSelf: "center",
  marginVertical: spacing[4],
  borderRadius: 12,
}

const START_RIDE_VIDEO =
  userLocale === "he"
    ? require("../../../assets/live-activity/start-ride-hebrew.mp4")
    : require("../../../assets/live-activity/start-ride-english.mp4")

export function StartRideAnnouncement({ navigation }: LiveAnnouncementStackProps) {
  return (
    <Screen unsafe={true} statusBar="light-content">
      <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: spacing[5] }}>
        <LiveAnnouncementBackground />

        <View style={{ marginTop: spacing[6] }}>
          <Text tx="liveAnnounce.startRide.title" preset="header" style={TITLE} />
          <Text tx="liveAnnounce.startRide.description" style={TEXT} />
          <Video source={START_RIDE_VIDEO} style={VIDEO_STYLE} repeat={true} />
          <Text tx="liveAnnounce.startRide.description2" style={[TEXT, { marginBottom: spacing[4] }]} />
        </View>

        <Button
          title={translate("common.next")}
          style={{ maxHeight: 60 }}
          onPress={() => {
            navigation.navigate("liveActivity")
          }}
        />
      </ScrollView>
    </Screen>
  )
}
