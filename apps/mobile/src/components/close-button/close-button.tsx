import React from "react"
import { Image, TouchableOpacity, ImageStyle, TouchableOpacityProps } from "react-native"
import { StyleSheet } from "react-native-unistyles"

interface CloseButtonProps extends TouchableOpacityProps {
  iconStyle?: ImageStyle
}

export function CloseButton({ onPress, iconStyle, ...props }: CloseButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel="חזרה" {...props}>
      <Image source={require("../../../assets/close.png")} style={[styles.closeIcon, iconStyle]} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme) => ({
  closeIcon: {
    width: 37.5,
    height: 37.5,
    tintColor: theme.colors.dim,
    opacity: 0.5,
  },
}))
