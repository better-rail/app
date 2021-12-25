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

function CloseButton({ onPress, ...props }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel="חזרה" {...props}>
      <Image source={require("../../../assets/close.png")} style={CLOSE_ICON_STYLE} />
    </TouchableOpacity>
  )
}

export default CloseButton
