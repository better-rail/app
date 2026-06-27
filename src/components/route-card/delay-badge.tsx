import React from "react"
import { View, Platform, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components/text/text"
import { translate } from "@/i18n"

interface DelayBadgeProps {
  delay: number
  onlyNumber?: boolean
}

export const DelayBadge = function DelayBadge(props: DelayBadgeProps) {
  const { delay, onlyNumber } = props

  const colorScheme = useColorScheme()
  const backgroundColor = colorScheme === "light" ? "#EE6958" : "#B22E4D"

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={styles.badgeText} maxFontSizeMultiplier={1.15}>
        {onlyNumber && "+"}
        {delay}

        {!onlyNumber && <> {translate("routes.delayTime")}</>}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingVertical: 1,
    paddingHorizontal: theme.spacing[2],
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: Platform.select({ ios: "500", android: "bold" }),
    color: theme.colors.whiteText,
  },
}))
