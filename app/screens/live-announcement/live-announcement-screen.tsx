import { TextStyle, View } from "react-native"
import { Screen, Text } from "../../components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { color, spacing } from "../../theme"

const SUB_TITLE: TextStyle = {
  color: color.whiteText,
  fontSize: 20,
  textAlign: "center",
  marginBottom: -4,
}

const TITLE: TextStyle = {
  color: color.whiteText,
  fontSize: 42,
  textAlign: "center",
}

const TEXT: TextStyle = {
  fontSize: 18,
  textAlign: "center",
  color: color.whiteText,
}

export function LiveAnnouncementScreen() {
  return (
    <Screen preset="scroll" unsafe={true} statusBar="light-content">
      <LiveAnnouncementBackground />

      <View style={{ marginTop: spacing[6], paddingHorizontal: spacing[5] }}>
        <Text tx="liveAnnounce.firstPage.subtitle" style={SUB_TITLE} />
        <Text tx="liveAnnounce.firstPage.title" preset="header" style={TITLE} />
        <Text tx="liveAnnounce.firstPage.description" style={TEXT} />
        <Text tx="liveAnnounce.firstPage.weMadeAGuide" style={TEXT} />
      </View>
    </Screen>
  )
}
