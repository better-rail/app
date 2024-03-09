import React from "react"
import { View, ViewStyle, TextStyle, Platform, useColorScheme } from "react-native"
import { Text } from "../text/text"
import { translate } from "../../i18n"
import { color, spacing } from "../../theme"

const CONTAINER: ViewStyle = {
  paddingVertical: 1,
  paddingHorizontal: spacing[2],
  borderRadius: 6,
}

const BADGE_TEXT: TextStyle = {
  fontSize: 14,
  fontWeight: Platform.select({ ios: "500", android: "bold" }),
  color: color.whiteText,
}

interface DelayBadgeProps {
  delay: number
  onlyNumber?: boolean
}

export const DelayBadge = function DelayBadge(props: DelayBadgeProps) {
  const { delay, onlyNumber } = props

  const colorScheme = useColorScheme()
  const backgroundColor = colorScheme === "light" ? "#EE6958" : "#B22E4Dt"

  return (
    <View style={[CONTAINER, { backgroundColor }]}>
      <Text style={BADGE_TEXT} maxFontSizeMultiplier={1.15}>
        {onlyNumber && "+"}
        {delay}

        {!onlyNumber && <> {translate("routes.delayTime")}</>}
      </Text>
    </View>
  )
}
