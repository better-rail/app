import React from "react"
import { useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import LinearGradient from "react-native-linear-gradient"

export const WidgetOnboardingBackground = () => {
  const colorScheme = useColorScheme()

  return <LinearGradient style={styles.gradient} colors={colorScheme === "dark" ? ["#2E25AD", "#5D54DB"] : ["#0575E6", "#021B79"]} />
}

const styles = StyleSheet.create({
  gradient: {
    height: "200%",
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    opacity: 1,
  },
})
