import * as React from "react"
import { Image, ViewStyle, ImageStyle, TouchableOpacity, TouchableOpacityProps } from "react-native"
import { observer } from "mobx-react-lite"
import { color } from "../../theme"
import HapticFeedback from "react-native-haptic-feedback"

const upDownArrowIcon = require("../../../assets/up-down-arrow.png")

const CONTAINER: ViewStyle = {
  width: 65,
  height: 65,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 50,
  backgroundColor: color.secondary,
  shadowOffset: { width: 0, height: 0.5 },
  shadowColor: color.palette.black,
  shadowRadius: 1,
  shadowOpacity: 0.5,
}

const ARROW_ICON: ImageStyle = {
  width: 35,
  height: 35,
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
