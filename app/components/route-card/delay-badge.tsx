import React from "react"
import { View, ViewStyle, TextStyle, Platform } from "react-native"
import { Text } from "../text/text"
import { translate } from "../../i18n"
import { color, spacing } from "../../theme"

const CONTAINER: ViewStyle = {
  marginTop: spacing[1],
  paddingVertical: 1,
  paddingHorizontal: spacing[2],
  backgroundColor: color.destroy,
  borderRadius: 6,
}

const BADGE_TEXT: TextStyle = {
  color: color.whiteText,
  fontSize: 14,
  fontWeight: Platform.select({ ios: "500", android: "bold" }),
}

interface DelayBadgeProps {
  delay: number
  onlyNumber?: boolean
}

export const DelayBadge = function DelayBadge(props: DelayBadgeProps) {
  const { delay, onlyNumber } = props

  return (
    <View style={CONTAINER}>
      <Text style={BADGE_TEXT} maxFontSizeMultiplier={1.15}>
        {onlyNumber && "+"}
        {delay}

        {!onlyNumber && <> {translate("routes.delayTime")}</>}
      </Text>
    </View>
  )
}
