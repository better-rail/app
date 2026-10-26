import { useState } from "react"
import { StyleSheet, type TextStyle } from "react-native"
import { HStack, Host, Text } from "@expo/ui/swift-ui"
import {
  animation,
  Animation,
  contentTransition,
  dynamicTypeSize,
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
} from "@expo/ui/swift-ui/modifiers"
import { primaryFont } from "@/theme/typography"
import type { NumericTextProps } from "./numeric-text.types"

const fontWeights = {
  "400": "regular",
  "500": "medium",
  "600": "semibold",
  "700": "bold",
  "800": "heavy",
  "900": "black",
} as const

type FontStyle = Pick<TextStyle, "fontSize" | "fontWeight" | "fontFamily" | "color">

function textModifiers({ fontSize, fontWeight, fontFamily, color }: FontStyle) {
  return [
    font({
      ...(fontFamily === "ui-rounded" ? { design: "rounded" as const } : { family: primaryFont }),
      size: fontSize,
      weight: fontWeights[fontWeight as keyof typeof fontWeights],
    }),
    dynamicTypeSize({ max: "large" }),
    ...(typeof color === "string" ? [foregroundStyle(color)] : []),
  ]
}

/** A number that rolls its digits with SwiftUI's numeric text transition */
export function NumericText({ children, value, style, fillWidth, unit, unitStyle }: NumericTextProps) {
  const [previous, setPrevious] = useState(value)
  const [countsDown, setCountsDown] = useState(false)
  if (value !== previous) {
    setCountsDown(value !== undefined && previous !== undefined && value < previous)
    setPrevious(value)
  }

  const number = (
    <Text
      modifiers={[
        ...textModifiers(StyleSheet.flatten(style) ?? {}),
        monospacedDigit(),
        contentTransition("numericText", { countsDown }),
        animation(Animation.spring({ response: 0.35, dampingFraction: 0.85 }), value ?? 0),
        ...(fillWidth && !unit ? [frame({ maxWidth: Infinity, alignment: "leading" })] : []),
      ]}
    >
      {children}
    </Text>
  )

  return (
    // Otherwise SwiftUI pushes the digits down as they scroll under the transparent header
    <Host matchContents={fillWidth ? { vertical: true } : true} style={fillWidth && styles.fill} ignoreSafeArea="all">
      {unit ? (
        // SwiftUI lays out the unit too, so it slides with the digits instead of React Native resizing the host
        <HStack
          alignment="firstTextBaseline"
          spacing={8}
          modifiers={[
            animation(Animation.spring({ response: 0.35, dampingFraction: 0.85 }), value ?? 0),
            ...(fillWidth ? [frame({ maxWidth: Infinity, alignment: "leading" })] : []),
          ]}
        >
          {number}
          <Text modifiers={textModifiers(StyleSheet.flatten(unitStyle) ?? {})}>{unit}</Text>
        </HStack>
      ) : (
        number
      )}
    </Host>
  )
}

const styles = StyleSheet.create({
  fill: {
    alignSelf: "stretch",
  },
})
