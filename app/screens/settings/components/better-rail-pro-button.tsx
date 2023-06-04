import { DynamicColorIOS, Platform, TouchableOpacity } from "react-native"
import LinearGradient from "react-native-linear-gradient"
import { spacing } from "../../../theme"
import { Text } from "../../../components"
import { useFontFamily } from "../../../hooks/use-font-family"

const colors = Platform.OS === "ios" && {
  start: DynamicColorIOS({ light: "#0017E4", dark: "#5E17EB" }),
  end: DynamicColorIOS({ light: "#3793FF", dark: "#9432C2" }),
}

export function BetterRailProButton({ onPress }) {
  const { fontFamily, isHeebo } = useFontFamily()

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{ marginBottom: spacing[4], shadowOffset: { height: 0, width: 0 }, shadowOpacity: 0.25, shadowRadius: 3 }}
      onPress={onPress}
    >
      {/* @ts-expect-error OpaqueColorValue */}
      <LinearGradient
        colors={[colors.start, colors.end]}
        style={{ height: 120, borderRadius: 16, justifyContent: "flex-end", padding: 16 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1.5, y: 0 }}
      >
        <Text
          style={{
            fontFamily: "System",
            color: "white",
            fontSize: 24,
            fontWeight: "700",
            letterSpacing: -0.4,
            textAlign: "left",
          }}
        >
          Better Rail Pro
        </Text>
        <Text
          tx="paywall.betterCommute"
          style={{
            fontFamily,
            color: "white",
            fontSize: 16,
            fontWeight: isHeebo ? "600" : "700",
            letterSpacing: -0.4,
            textAlign: "left",
          }}
        />
      </LinearGradient>
    </TouchableOpacity>
  )
}
