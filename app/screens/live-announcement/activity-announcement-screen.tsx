import { Image, ImageStyle, ScrollView, TextStyle, View } from "react-native"
import { Button, Screen, Text } from "../../components"
import { LiveAnnouncementBackground } from "./live-announcement-bg"
import { color, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"
import { useSafeAreaInsets } from "react-native-safe-area-context"

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
  marginTop: spacing[6],
}

export function ActivityAnnouncementScreen({ navigation }: LiveAnnouncementStackProps) {
  const insets = useSafeAreaInsets()
  const LIVE_ACTIVITY =
    userLocale === "he"
      ? require("../../../assets/live-activity/live-activity-hebrew.png")
      : require("../../../assets/live-activity/live-activity-delay-english.png")

  return (
    <Screen unsafe={true} statusBar="light-content">
      <LiveAnnouncementBackground />
      <ScrollView contentContainerStyle={{ flex: 1, paddingTop: insets.top, paddingHorizontal: spacing[5] }}>
        <View style={{ marginTop: spacing[4] }}>
          <Text tx="liveAnnounce.liveActivity.title" preset="header" style={TITLE} />
          <Text tx="liveAnnounce.liveActivity.description" style={[TEXT, { marginBottom: spacing[4] }]} />
          <Text tx="liveAnnounce.liveActivity.tip" style={TEXT} />
          <View
            style={{
              shadowColor: "#333",
              shadowOffset: { height: 0, width: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
            }}
          >
            <Image source={LIVE_ACTIVITY} style={LIVE_ACTIVITY_IMAGE} />
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <Button
          title={translate("common.next")}
          style={{ maxHeight: 60 }}
          onPress={() => {
            navigation.navigate("dynamicIsland")
          }}
        />
      </ScrollView>
    </Screen>
  )
}
