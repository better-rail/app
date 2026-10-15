import { Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import HapticFeedback from "react-native-haptic-feedback"
import { Text } from "@/components"
import { translate } from "@/i18n"
import type { PassengerStepperProps } from "./passenger-stepper.types"

export function PassengerStepper({ value, max, onChange }: PassengerStepperProps) {
  const canDecrement = value > 1
  const canIncrement = value < max

  const change = (next: number) => {
    if (next < 1 || next > max) return
    HapticFeedback.trigger("selection")
    onChange(next)
  }

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={translate("voucher.passengers") ?? undefined}
      accessibilityValue={{ min: 1, max, now: value, text: String(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => change(event.nativeEvent.actionName === "increment" ? value + 1 : value - 1)}
    >
      <Pressable
        onPress={() => change(value - 1)}
        disabled={!canDecrement}
        hitSlop={8}
        style={[styles.button, !canDecrement && styles.buttonDisabled]}
        accessibilityLabel={translate("voucher.removePassenger") ?? undefined}
      >
        <View style={styles.bar} />
      </Pressable>

      <Text style={styles.value} maxFontSizeMultiplier={1.4}>
        {value}
      </Text>

      <Pressable
        onPress={() => change(value + 1)}
        disabled={!canIncrement}
        hitSlop={8}
        style={[styles.button, !canIncrement && styles.buttonDisabled]}
        accessibilityLabel={translate("voucher.addPassenger") ?? undefined}
      >
        {/* Drawn rather than typed, since font metrics push the glyphs off-center */}
        <View style={styles.bar} />
        <View style={[styles.bar, styles.barVertical]} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[5],
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  bar: {
    position: "absolute",
    width: 16,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: theme.colors.whiteText,
  },
  barVertical: {
    transform: [{ rotate: "90deg" }],
  },
  value: {
    minWidth: 40,
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
}))
