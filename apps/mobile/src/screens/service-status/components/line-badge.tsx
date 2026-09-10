import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import type { RailLine } from "@/data/rail-lines"
import { contrastText } from "../service-status-theme"

type LineBadgeProps = {
  line: Pick<RailLine, "badge" | "color"> & Partial<Pick<RailLine, "badgeStyle" | "textColor">>
  size?: number
}

/** The line's number on a rounded square in the line's colour. */
export function LineBadge({ line, size = 34 }: LineBadgeProps) {
  const outline = line.badgeStyle === "outline"
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.28 },
        outline ? { borderColor: line.color, borderWidth: 2.5 } : { backgroundColor: line.color },
      ]}
      accessibilityElementsHidden
    >
      <Text
        style={[
          styles.text,
          { fontSize: size * 0.48, color: outline ? line.color : (line.textColor ?? contrastText(line.color)) },
        ]}
        maxFontSizeMultiplier={1}
      >
        {line.badge}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create(() => ({
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "800",
    letterSpacing: -0.5,
  },
}))
