import { View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import HapticFeedback from "react-native-haptic-feedback"
import { FilledIconButton, Host, Icon } from "@expo/ui/jetpack-compose"
import { size } from "@expo/ui/jetpack-compose/modifiers"
import { Text } from "@/components"
import { translate } from "@/i18n"
import type { PassengerStepperProps } from "./passenger-stepper.types"

const ADD_ICON = require("../../../../assets/add.xml")
const REMOVE_ICON = require("../../../../assets/remove.xml")

/** Material filled icon buttons (Jetpack Compose) around the count. */
export function PassengerStepper({ value, max, onChange }: PassengerStepperProps) {
  const { theme } = useUnistyles()

  const change = (next: number) => {
    if (next < 1 || next > max) return
    HapticFeedback.trigger("selection")
    onChange(next)
  }

  const buttonColors = {
    containerColor: theme.colors.primary,
    contentColor: theme.colors.whiteText,
    disabledContainerColor: theme.colors.disabled,
    disabledContentColor: theme.colors.whiteText,
  }

  const stepButton = (icon: number, label: string | null, next: number, isEnabled: boolean) => (
    <Host matchContents>
      <FilledIconButton onClick={() => change(next)} enabled={isEnabled} colors={buttonColors} modifiers={[size(48, 48)]}>
        <Icon source={icon} size={24} contentDescription={label ?? undefined} />
      </FilledIconButton>
    </Host>
  )

  return (
    // The wrapper is the single adjustable element, as on iOS
    <View
      style={styles.container}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={translate("voucher.passengers") ?? undefined}
      accessibilityValue={{ min: 1, max, now: value, text: String(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => change(event.nativeEvent.actionName === "increment" ? value + 1 : value - 1)}
    >
      {stepButton(REMOVE_ICON, translate("voucher.removePassenger"), value - 1, value > 1)}
      {/* RN Text, since Compose only loads Heebo's regular weight */}
      <Text style={styles.value} maxFontSizeMultiplier={1.4}>
        {value}
      </Text>
      {stepButton(ADD_ICON, translate("voucher.addPassenger"), value + 1, value < max)}
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
  value: {
    minWidth: 40,
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
}))
