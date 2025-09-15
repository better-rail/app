import * as React from "react"
import {
  Image,
  ViewStyle,
  ImageStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  Platform,
  Dimensions,
  PlatformColor,
  Pressable,
} from "react-native"
import { observer } from "mobx-react-lite"
import { color } from "../../theme"
import { translate } from "../../i18n"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"

const upDownArrowIcon = require("../../../assets/up-down-arrow.png")

const { height: deviceHeight } = Dimensions.get("screen")

let buttonSize = 62.5
let iconSize = 32.5

if (deviceHeight > 730) {
  buttonSize = 70
  iconSize = 35
}

if (deviceHeight > 900) {
  buttonSize = 75
  iconSize = 37
}

const CONTAINER: ViewStyle = {
  width: buttonSize,
  height: buttonSize,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 50,
  backgroundColor: color.secondary,
  shadowOffset: { width: 0, height: 0.5 },
  shadowColor: color.palette.black,
  shadowRadius: 0.4,
  shadowOpacity: 0.5,
  elevation: 2,
}

const ARROW_ICON: ImageStyle = {
  width: Platform.select({ ios: iconSize, android: iconSize + 2.5 }),
  height: Platform.select({ ios: iconSize, android: iconSize + 2.5 }),
  tintColor: "#fff",
}

export interface ChangeDirectionButtonProps extends TouchableOpacityProps {
  /**
   * An optional style override useful for padding & margin.
   */
  buttonStyle?: ViewStyle
}

/**
 * Describe your component here
 */
export const ChangeDirectionButton = observer(function ChangeDirectionButton(props: ChangeDirectionButtonProps) {
  const { onPress, buttonStyle } = props

  if (isLiquidGlassSupported) {
    return (
      <Pressable {...props} style={buttonStyle}>
        <LiquidGlassView interactive style={CONTAINER} tintColor={color.secondary}>
          <Image source={upDownArrowIcon} style={ARROW_ICON} />
        </LiquidGlassView>
      </Pressable>
    )
  }

  return (
    <TouchableOpacity
      style={[CONTAINER, buttonStyle]}
      activeOpacity={onPress ? 0.9 : 1}
      accessibilityLabel={translate("plan.switchStations")}
      accessibilityHint={translate("plan.switchStationsHint")}
      {...props}
    >
      <Image source={upDownArrowIcon} style={ARROW_ICON} />
    </TouchableOpacity>
  )
})
