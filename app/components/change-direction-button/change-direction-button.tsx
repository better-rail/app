import * as React from "react"
import { Image, ViewStyle, ImageStyle, TouchableOpacity, TouchableOpacityProps, Platform } from "react-native"
import { observer } from "mobx-react-lite"
import { color } from "../../theme"
import HapticFeedback from "react-native-haptic-feedback"

const upDownArrowIcon = require("../../../assets/up-down-arrow.png")

const CONTAINER: ViewStyle = {
  width: 70,
  height: 70,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 50,
  backgroundColor: color.secondary,
  shadowOffset: { width: 0, height: 0.5 },
  shadowColor: color.palette.black,
  shadowRadius: 0.4,
  shadowOpacity: 0.5,
  elevation: 1,
}

const ARROW_ICON: ImageStyle = {
  width: Platform.select({ ios: 35, android: 37.5 }),
  height: Platform.select({ ios: 35, android: 37.5 }),
  tintColor: color.background,
}

export interface ChangeDirectionButtonProps extends TouchableOpacityProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle
}

/**
 * Describe your component here
 */
export const ChangeDirectionButton = observer(function ChangeDirectionButton(props: ChangeDirectionButtonProps) {
  const { onPress, style } = props

  return (
    <TouchableOpacity
      style={[CONTAINER, style]}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={(e) => {
        if (onPress) {
          HapticFeedback.trigger("impactMedium")
          onPress(e)
        }
      }}
      accessibilityLabel="החלפת תחנות"
      accessibilityHint="קיצור דרך להחלפת תחנת המוצא עם תחנת היעד"
    >
      <Image source={upDownArrowIcon} style={ARROW_ICON} />
    </TouchableOpacity>
  )
})
