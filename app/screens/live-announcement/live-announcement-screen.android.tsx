import { Image, ImageStyle, ScrollView, TextStyle, View } from "react-native"
import { Button, Text } from "../../components"
import { color, fontScale, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"

const SUB_TITLE: TextStyle = {
  fontSize: 24,
  textAlign: "center",
}
const TITLE: TextStyle = {
  fontSize: 30,
  fontWeight: "bold",
  textAlign: "center",
}
const TEXT: TextStyle = { fontSize: 22, textAlign: "center" }
const IMAGE: ImageStyle = {
  width: "100%",
  height: userLocale === "he" ? 400 : 345,
  resizeMode: "contain",
  marginVertical: fontScale > 1.1 ? spacing[4] : spacing[5],
}

export function LiveAnnouncementScreen({ navigation }: LiveAnnouncementStackProps) {
  const LIVE_IMAGE =
    userLocale === "he"
      ? require("../../../assets/live-ride/live-ride-intro.png")
      : require("../../../assets/live-ride/live-ride-intro-english.png")

  return (
    <ScrollView contentContainerStyle={{ height: "100%", paddingTop: spacing[7] + 4, backgroundColor: color.tertiaryBackground }}>
      <View style={{ height: "100%", flex: 1, alignItems: "center", paddingHorizontal: spacing[2] }}>
        <Text tx="liveAnnounce.announcement.subtitle" style={SUB_TITLE} />
        <Text tx="liveAnnounce.announcement.title" style={TITLE} />
        <Image source={LIVE_IMAGE} style={IMAGE} />
        <Text tx="liveAnnounce.announcement.androidDescription" style={[TEXT, { marginBottom: spacing[5] }]} />
        <Button
          onPress={() => navigation.navigate("startRide")}
          containerStyle={{ maxHeight: 60, width: "90%" }}
          title={translate("common.next")}
        />
      </View>
    </ScrollView>
  )
}
