import { Dimensions, Image, ImageStyle, ScrollView, TextStyle, View, ViewStyle } from "react-native"
import { Button, Screen, Text } from "../../components"
import { color, fontScale, spacing } from "../../theme"
import { translate } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as storage from "../../utils/storage"
import { useIsDarkMode } from "../../hooks"
import { NextButton } from "./announcement-next-button"
import analytics from "@react-native-firebase/analytics"

const deviceHeight = Dimensions.get("screen").height
const isHighDevice = deviceHeight > 800

const TITLE: TextStyle = {
  fontSize: 30,
  textAlign: "center",
  marginBottom: spacing[2],
  fontWeight: "800",
  letterSpacing: -0.8,
}

const TEXT: TextStyle = {
  fontSize: isHighDevice ? 20 : 18,
  textAlign: "center",
}

const AVATARS: ViewStyle = {
  marginTop: spacing[2],
  marginBottom: spacing[5],
  flexDirection: "row",
  gap: -16,
  alignItems: "center",
  justifyContent: "center",
}

const AVATAR_WRAPPER: ViewStyle = {
  elevation: 4,
  borderRadius: 100,
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
  const isDarkMode = useIsDarkMode()
  const insets = useSafeAreaInsets()

  const finish = () => {
    navigation.popTo("mainStack", {
      screen: "planner",
    })
    storage.save("seenLiveAnnouncement", new Date().toISOString())
  }

  return (
    <Screen unsafe={true}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 4,
          paddingHorizontal: spacing[2],
          paddingBottom: spacing[5] * fontScale,
        }}
      >
        <View style={{ marginTop: spacing[2], marginBottom: spacing[4], paddingHorizontal: spacing[4] }}>
          <Text tx="liveAnnounce.supportUs.title" preset="header" style={TITLE} />

          <View style={AVATARS}>
            <View style={AVATAR_WRAPPER}>
              <Image source={GUY_IMAGE} style={AVATAR} />
            </View>
            <View style={AVATAR_WRAPPER}>
              <Image source={MATAN_IMAGE} style={AVATAR} />
            </View>
          </View>
          <View style={{ gap: isHighDevice ? spacing[4] : spacing[2] + 1 }}>
            <Text tx="liveAnnounce.supportUs.description1" style={TEXT} maxFontSizeMultiplier={1.1} />
            <View>
              <Text tx="liveAnnounce.supportUs.description3" style={TEXT} maxFontSizeMultiplier={1.1} />
            </View>
            <Text tx="liveAnnounce.supportUs.description4" style={TEXT} maxFontSizeMultiplier={1.1} />
            <Text tx="liveAnnounce.supportUs.description5" style={[TEXT]} maxFontSizeMultiplier={1.1} />
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: spacing[3] }}>
          <Button
            title={translate("liveAnnounce.supportUs.tipJarButton")}
            style={{ minHeight: 55 * fontScale, backgroundColor: isDarkMode ? color.success : color.greenText }}
            containerStyle={{ minHeight: 55 * fontScale }}
            onPress={() => {
              analytics().logEvent("live_announcement_tip_jar_press")
              finish()

              setTimeout(() => {
                navigation.navigate("settingsStack", { screen: "tipJar" })
              }, 150)
            }}
          />
          <Text
            style={[TEXT, { fontSize: 18, marginHorizontal: -14 }]}
            tx="liveAnnounce.supportUs.tipJarNote"
            maxFontSizeMultiplier={1.1}
          />
          <Button
            title={translate("common.done")}
            onPress={() => {
              analytics().logEvent("live_announcement_done_press")
              finish()
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  )
}
