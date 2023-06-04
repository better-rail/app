import { ImageStyle, ScrollView, TextStyle, View } from "react-native"
import Video from "react-native-video"
import { Button, Screen, Text } from "../../components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { color, spacing } from "../../theme"
import { translate } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"

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
  width: 358,
  height: 358,
  alignSelf: "center",
  marginVertical: spacing[4],
  paddingHorizontal: -24,
  marginHorizontal: -200,
  borderRadius: 12,
}

const DYNAMIC_ISLAND_VIDEO = require("../../../assets/live-activity/dynamic-island-hebrew.mp4")

export function DynamicIslandScreen({ navigation }: LiveAnnouncementStackProps) {
  return (
    <Screen unsafe={true} statusBar="light-content">
      <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: spacing[5] }}>
        <LiveAnnouncementBackground />

        <View style={{ marginTop: spacing[6] }}>
          <Text tx="liveAnnounce.dynamicIsland.title" preset="header" style={TITLE} />
          <Text tx="liveAnnounce.dynamicIsland.description" style={TEXT} />
          <Video source={DYNAMIC_ISLAND_VIDEO} style={VIDEO_STYLE} repeat={true} />
          <Text tx="liveAnnounce.dynamicIsland.description2" style={[TEXT, { marginBottom: spacing[4] }]} />
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
