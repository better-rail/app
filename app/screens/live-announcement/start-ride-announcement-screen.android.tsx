import { ImageStyle, ScrollView, TextStyle, View } from "react-native"
import Video from "react-native-video"
import { Button, Text } from "../../components"
import { color, spacing } from "../../theme"
import { translate } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"

const TITLE: TextStyle = {
  fontSize: 30,
  fontWeight: "bold",
  textAlign: "center",
}
const TEXT: TextStyle = { fontSize: 22, textAlign: "center" }

// const VIDEO_WRAPPER: ViewStyle = {
//   shadowColor: "#333",
//   shadowOffset: { width: 0, height: 0 },
//   shadowOpacity: 0.3,
//   shadowRadius: 4,
//   // paddingHorizontal: -1000,
// }

const VIDEO_STYLE: ImageStyle = {
  width: 440,
  height: 440,
  // alignSelf: "center",
  marginVertical: spacing[4],
  borderRadius: 12,
}

const START_RIDE_VIDEO = require("../../../assets/live-ride/start-live-ride.mp4")

export function StartRideAnnouncement({ navigation }: LiveAnnouncementStackProps) {
  return (
    <ScrollView contentContainerStyle={{ height: "100%", paddingTop: spacing[4], backgroundColor: color.tertiaryBackground }}>
      <View style={{ flex: 1, alignItems: "center", paddingHorizontal: spacing[2] }}>
        <Text tx="liveAnnounce.startRide.title" preset="header" style={TITLE} maxFontSizeMultiplier={1.1} />
        <Text tx="liveAnnounce.startRide.description" style={TEXT} maxFontSizeMultiplier={1.1} />

        <Video source={START_RIDE_VIDEO} style={VIDEO_STYLE} repeat={true} />

        <Text tx="liveAnnounce.startRide.description2" style={[TEXT, { marginBottom: spacing[4] }]} maxFontSizeMultiplier={1.1} />
        <Button
          onPress={() => navigation.navigate("liveActivity")}
          containerStyle={{ maxHeight: 60, width: "90%" }}
          title={translate("common.next")}
        />
      </View>
    </ScrollView>
  )
}
