import { ViewStyle, Platform, View, Text, TextStyle } from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { fontScale, spacing, color } from "../../theme"
import { openLink } from "../../utils/helpers/open-link"

const ANNOUNCEMENT_CARD: ViewStyle = {
  maxWidth: "100%",
  minWidth: "100%",
  minHeight: 80 * fontScale,
  backgroundColor: color.inputBackground,
  marginBottom: spacing[4],
  paddingTop: spacing[3],
  paddingBottom: spacing[2],
  paddingStart: spacing[3],
  paddingEnd: spacing[4],
  borderRadius: Platform.select({ ios: 12, android: 8 }),
  shadowColor: color.palette.black,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.05,
  elevation: 1,
}

const TITLE_STYLE: TextStyle = {
  fontFamily: "Heebo",
  color: color.primary,
  fontSize: fontScale * 16,
}

const BODY_STYLE: TextStyle = {
  fontFamily: "Heebo",
  fontSize: fontScale * 14,
}

type AnnouncementCardProps = {
  title: string
  body: string
  link?: string
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ title, body, link }) => {
  return (
    <TouchableScale activeScale={0.98} friction={10} disabled={!link} onPress={() => openLink(link)}>
      <View style={ANNOUNCEMENT_CARD}>
        <Text style={TITLE_STYLE}>{title}</Text>
        <Text style={BODY_STYLE}>{body}</Text>
      </View>
    </TouchableScale>
  )
}
