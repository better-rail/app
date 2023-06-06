import { Image, ImageStyle, ScrollView, TextStyle, View, ViewStyle } from "react-native"
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

const AVATARS: ViewStyle = {
  marginTop: spacing[3],
  marginBottom: spacing[5],
  flexDirection: "row",
  gap: -24,
  alignItems: "center",
  justifyContent: "center",
}

const AVATAR_WRAPPER = {
  shadowColor: "#333",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.7,
  shadowRadius: 5,
}

const AVATAR: ImageStyle = {
  width: 120,
  height: 120,
  borderRadius: 60,
  resizeMode: "cover",
}

const GUY_IMAGE = require("../../../assets/live-activity/guy.jpeg")
const MATAN_IMAGE = require("../../../assets/live-activity/matan.jpeg")

export function SupportUsScreen({ navigation }: LiveAnnouncementStackProps) {
  return (
    <Screen unsafe={true} statusBar="light-content">
      <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: spacing[5] }}>
        <LiveAnnouncementBackground />

        <View style={{ marginTop: spacing[6] }}>
          <Text tx="liveAnnounce.supportUs.title" preset="header" style={TITLE} />

          <View style={AVATARS}>
            <View style={AVATAR_WRAPPER}>
              <Image source={GUY_IMAGE} style={AVATAR} />
            </View>
            <View style={AVATAR_WRAPPER}>
              <Image source={MATAN_IMAGE} style={AVATAR} />
            </View>
          </View>
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
