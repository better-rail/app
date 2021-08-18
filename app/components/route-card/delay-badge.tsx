import React from "react"
import { View, ViewStyle, TextStyle, Platform } from "react-native"
import { Text } from "../text/text"
import { translate } from "../../i18n"
import { color, spacing } from "../../theme"

const CONTAINER: ViewStyle = {
  marginTop: spacing[1],
  paddingVertical: spacing[0],
  paddingHorizontal: spacing[3],
  backgroundColor: color.destroy,
  borderRadius: 12,
}

const BADGE_TEXT: TextStyle = {
  color: color.whiteText,
  fontSize: 14,
  fontWeight: Platform.select({ ios: "500", android: "bold" }),
}

interface DelayBadgeProps {
  delay: number
}

export const DelayBadge = function DelayBadge(props: DelayBadgeProps) {
  const { delay } = props

  return (
    <View style={CONTAINER}>
      <Text style={BADGE_TEXT}>
        {delay} {translate("routes.delayTime")}
      </Text>
    </View>
  )
}
