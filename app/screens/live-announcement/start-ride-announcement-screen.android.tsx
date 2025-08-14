import { ImageStyle, ScrollView, TextStyle, View } from "react-native"
import { VideoView, useVideoPlayer } from "expo-video"
import { Button, Text } from "../../components"
import { color, spacing } from "../../theme"
import { translate, userLocale } from "../../i18n"
import { LiveAnnouncementStackProps } from "../../navigators/live-activity-announcement/live-activity-announcement-stack"

const TITLE: TextStyle = {
  fontSize: 30,
  fontWeight: "bold",
  textAlign: "center",
}

const TEXT: TextStyle = { fontSize: 22, textAlign: "center" }

const VIDEO_STYLE: ImageStyle = {
  width: "100%",
  aspectRatio: 1,
  marginVertical: spacing[4],
  borderRadius: 8,
}

const START_RIDE_VIDEO_HEBREW = require("../../../assets/live-ride/start-live-ride.mp4")
const START_RIDE_VIDEO_ENGLISH = require("../../../assets/live-ride/start-live-ride-english.mp4")

export function StartRideAnnouncement({ navigation }: LiveAnnouncementStackProps) {
  const START_RIDE_VIDEO = userLocale === "he" ? START_RIDE_VIDEO_HEBREW : START_RIDE_VIDEO_ENGLISH

  const player = useVideoPlayer(START_RIDE_VIDEO, (player) => {
    player.loop = true
    player.play()
  })

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
        <Text tx="liveAnnounce.startRide.title" preset="header" style={TITLE} maxFontSizeMultiplier={1.1} />
        <Text tx="liveAnnounce.startRide.description" style={TEXT} maxFontSizeMultiplier={1.1} />

        <VideoView player={player} style={VIDEO_STYLE} />

        <Text tx="liveAnnounce.startRide.description2" style={[TEXT, { marginBottom: spacing[4] }]} maxFontSizeMultiplier={1.1} />
        <Button onPress={() => navigation.navigate("liveActivity")} title={translate("common.next")} />
      </ScrollView>
    </View>
  )
}
