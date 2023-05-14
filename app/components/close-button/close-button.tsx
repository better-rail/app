import React from "react"
import { Image, TouchableOpacity, ImageStyle, ButtonProps } from "react-native"
import { color } from "../../theme"

const CLOSE_ICON_STYLE: ImageStyle = {
  width: 37.5,
  height: 37.5,
  marginLeft: 7.5,
  marginBottom: 7.5,
  tintColor: color.dim,
  opacity: 0.5,
}

interface CloseButtonProps extends ButtonProps {
  iconStyle?: ImageStyle
}

function CloseButton({ onPress, iconStyle, ...props }: CloseButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel="חזרה" {...props}>
      <Image source={require("../../../assets/close.png")} style={[CLOSE_ICON_STYLE, iconStyle]} />
    </TouchableOpacity>
  )
}

export default CloseButton
