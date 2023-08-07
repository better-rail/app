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
  height: 420,
  resizeMode: "contain",
  marginVertical: fontScale > 1.1 ? spacing[4] : spacing[5],
}

export function LiveAnnouncementScreen({ navigation }: LiveAnnouncementStackProps) {
  const LIVE_IMAGE =
    userLocale === "he"
      ? require("../../../assets/live-ride/live-ride-intro.png")
      : require("../../../assets/live-ride/live-ride-intro-english.png")

  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: color.tertiaryBackground }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing[7] + 4,
          paddingBottom: spacing[3],
          paddingHorizontal: spacing[2],
          backgroundColor: color.tertiaryBackground,
        }}
      >
        <Text tx="liveAnnounce.announcement.subtitle" style={SUB_TITLE} maxFontSizeMultiplier={1.2} />
        <Text tx="liveAnnounce.announcement.title" style={TITLE} maxFontSizeMultiplier={1.2} />
        <Image source={LIVE_IMAGE} style={IMAGE} />
        <Text
          tx="liveAnnounce.announcement.androidDescription"
          style={[TEXT, { marginBottom: spacing[5] }]}
          maxFontSizeMultiplier={1.2}
        />

        <Button onPress={() => navigation.navigate("startRide")} title={translate("common.next")} />
      </ScrollView>
    </View>
  )
}
