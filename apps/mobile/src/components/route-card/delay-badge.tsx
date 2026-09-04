import React from "react"
import { View, Platform } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components/text/text"
import { translate } from "@/i18n"

interface DelayBadgeProps {
  delay: number
  onlyNumber?: boolean
}

export const DelayBadge = function DelayBadge(props: DelayBadgeProps) {
  const { delay, onlyNumber } = props

  return (
    <View style={styles.container}>
      <Text style={styles.badgeText} maxFontSizeMultiplier={1.15}>
        {onlyNumber && "+"}
        {delay}

        {!onlyNumber && <> {translate("routes.delayTime")}</>}
      </Text>
    </View>
  )
}

export const CancelledBadge = function CancelledBadge() {
  return (
    <View style={styles.container}>
      <Text style={styles.badgeText} maxFontSizeMultiplier={1.15} tx="routes.cancelled" />
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    paddingVertical: 1,
    paddingHorizontal: theme.spacing[2],
    borderRadius: 6,
    backgroundColor: rt.colorScheme === "light" ? "#EE6958" : "#B22E4D",
  },
  badgeText: {
    fontSize: 14,
    fontWeight: Platform.select({ ios: "500", android: "bold" }),
    color: theme.colors.whiteText,
  },
}))
