import * as React from "react"
import { Image, ViewStyle, ImageStyle, TouchableOpacity, TouchableOpacityProps } from "react-native"
import { observer } from "mobx-react-lite"
import { color } from "../../theme"

const upDownArrowIcon = require("../../../assets/up-down-arrow.png")

const CONTAINER: ViewStyle = {
  width: 65,
  height: 65,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 50,
  backgroundColor: color.secondary,
}

const ARROW_ICON: ImageStyle = {
  width: 35,
  height: 35,
  tintColor: color.background,
}

export interface SwitchStationsButtonProps extends TouchableOpacityProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle
}

/**
 * Describe your component here
 */
export const SwitchStationsButton = observer(function SwitchStationsButton(props: SwitchStationsButtonProps) {
  const { onPress, style } = props

  return (
    <TouchableOpacity
      style={[CONTAINER, style]}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityLabel="החלפת תחנות"
      accessibilityHint="קיצור דרך להחלפת תחנת המוצא עם תחנת היעד"
    >
      <Image source={upDownArrowIcon} style={ARROW_ICON} />
    </TouchableOpacity>
  )
})
