import { TouchableOpacity, Image, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { translate } from "@/i18n"
import { isLiquidGlassSupported } from "@callstack/liquid-glass"

let menuIcon = require("../../../assets/ellipsis.png")
if (isLiquidGlassSupported) {
  menuIcon = require("../../../assets/ellipsis.regular.png")
}

export const MenuIcon = function CalendarIcon(props: { style?: ViewStyle }) {
  const { style } = props

  if (isLiquidGlassSupported) {
    return <Image source={menuIcon} style={[styles.icon, { width: 20, height: 20 }]} />
  }

  return (
    <TouchableOpacity style={[styles.container, style]} accessibilityRole="button" accessibilityLabel={translate("routes.routeActions")}>
      <Image source={menuIcon} style={[styles.icon]} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create((theme) => ({
  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
    tintColor: isLiquidGlassSupported ? theme.colors.text : "lightgrey",
    opacity: 0.9,
  },
  container: {
    justifyContent: "center",
  },
}))
