import { View } from "react-native"
import { Text } from "@/components"
import type { NumericTextProps } from "./numeric-text.types"

// Non-iOS: no SwiftUI numeric transition, so the number just swaps
export function NumericText({ children, style, unit, unitStyle }: NumericTextProps) {
  const number = (
    <Text style={style} maxFontSizeMultiplier={1.1}>
      {children}
    </Text>
  )
  if (!unit) return number
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
      {number}
      <Text style={unitStyle}>{unit}</Text>
    </View>
  )
}
