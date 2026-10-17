import { useState } from "react"
import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import HapticFeedback from "react-native-haptic-feedback"
import { Button, Host, HStack, Image, Text } from "@expo/ui/swift-ui"
import {
  animation,
  Animation,
  buttonBorderShape,
  buttonStyle,
  contentTransition,
  disabled,
  font,
  frame,
  monospacedDigit,
} from "@expo/ui/swift-ui/modifiers"
import { translate } from "@/i18n"
import { primaryFont } from "@/theme/typography"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import type { PassengerStepperProps } from "./passenger-stepper.types"

const BUTTON_STYLE = isLiquidGlassSupported ? "glassProminent" : "borderedProminent"

/** SwiftUI stepper: glass buttons and a rolling numeric count. */
export function PassengerStepper({ value, max, onChange }: PassengerStepperProps) {
  const [countsDown, setCountsDown] = useState(false)

  const change = (next: number) => {
    if (next < 1 || next > max) return
    HapticFeedback.trigger("selection")
    setCountsDown(next < value)
    onChange(next)
  }

  const stepButton = (symbol: "plus" | "minus", next: number, isDisabled: boolean) => (
    <Button
      onPress={() => change(next)}
      modifiers={[buttonStyle(BUTTON_STYLE), buttonBorderShape("circle"), disabled(isDisabled)]}
    >
      <Image
        systemName={symbol}
        // The glass style pads each side, making a 52pt circle
        modifiers={[font({ size: 20, weight: "semibold" }), frame({ width: 38, height: 38 })]}
      />
    </Button>
  )

  return (
    // The wrapper is the single adjustable element; VoiceOver doesn't reach the SwiftUI buttons
    <View
      style={styles.container}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={translate("voucher.passengers") ?? undefined}
      accessibilityValue={{ min: 1, max, now: value, text: String(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => change(event.nativeEvent.actionName === "increment" ? value + 1 : value - 1)}
    >
      <Host matchContents>
        <HStack spacing={24}>
          {stepButton("minus", value - 1, value <= 1)}
          <Text
            modifiers={[
              font({ family: primaryFont, size: 34, weight: "bold" }),
              monospacedDigit(),
              frame({ minWidth: 40 }),
              contentTransition("numericText", { countsDown }),
              animation(Animation.spring({ response: 0.3, dampingFraction: 0.85 }), value),
            ]}
          >
            {String(value)}
          </Text>
          {stepButton("plus", value + 1, value >= max)}
        </HStack>
      </Host>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
})
