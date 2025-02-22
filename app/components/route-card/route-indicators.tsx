import { Platform, TextStyle, View, ViewStyle } from "react-native"
import { Text } from "../text/text"
import { DelayBadge } from "./delay-badge"
import { userLocale } from "../../i18n"
import { color, spacing } from "../../theme"

const WRAPPER: ViewStyle = {
  marginTop: Platform.OS === "ios" ? (userLocale === "he" ? 4 : 2) : 6,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing[2],
}

const SHORT_ROUTE_BADGE: ViewStyle = {
  paddingVertical: 1,
  paddingHorizontal: spacing[2],
  backgroundColor: color.greenBackground,
  borderRadius: 6,
}

const SHORT_ROUTE_BADGE_TEXT: TextStyle = {
  fontSize: 14,
  color: color.greenText,
}

/**
 * Displays route indicators (stops count, delay, short route badge) in the route card.
 */
export const RouteIndicators = ({ isMuchShorter, isMuchLonger, delay, stopsText, isRideActive }) => {
  if (isMuchShorter && !isMuchLonger) {
    return (
      <View style={WRAPPER}>
        <View style={[SHORT_ROUTE_BADGE, isRideActive && { backgroundColor: color.contrastedGreenBackground }]}>
          <Text style={SHORT_ROUTE_BADGE_TEXT} tx="routes.shortRoute" />
        </View>
        {delay > 0 && <DelayBadge delay={delay} onlyNumber />}
      </View>
    )
  } else if (delay > 0) {
    return <DelayBadge delay={delay} />
  } else {
    return (
      <Text style={{ fontSize: 14 }} maxFontSizeMultiplier={1}>
        {stopsText}
      </Text>
    )
  }
}
