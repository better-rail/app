import React from "react"
import { useColorScheme, ViewStyle } from "react-native"
import { LinearGradient } from "expo-linear-gradient"

const GARDIENT: ViewStyle = {
  height: "200%",
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
}

export const LiveAnnouncementBackground = () => {
  const colorScheme = useColorScheme()

  return <LinearGradient style={GARDIENT} colors={colorScheme === "dark" ? ["#2E25AD", "#5D54DB"] : ["#0575E6", "#021B79"]} />
}
