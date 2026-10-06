import { Text } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { formatHourBubble } from "./hour-format"
import type { HourBubbleTextProps } from "./hour-bubble-text.types"

// Non-iOS: no SwiftUI numeric transition, so the hour just swaps
export function HourBubbleText({ hour }: HourBubbleTextProps) {
  if (hour === null) return null
  // Capped so the hour still fits the fixed-size bubble at large text sizes
  return (
    <Text style={styles.text} maxFontSizeMultiplier={1.3}>
      {formatHourBubble(hour)}
    </Text>
  )
}

const styles = StyleSheet.create((theme) => ({
  text: {
    fontFamily: theme.typography.primary,
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: theme.colors.text,
  },
}))
