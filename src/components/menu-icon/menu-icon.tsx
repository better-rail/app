import { TouchableOpacity, Image, type ImageStyle, type ViewStyle } from "react-native"
import { translate } from "../../i18n"
import { isLiquidGlassSupported } from "@callstack/liquid-glass"
import { color } from "../../theme"

let menuIcon = require("../../../assets/ellipsis.png")
if (isLiquidGlassSupported) {
  menuIcon = require("../../../assets/ellipsis.regular.png")
}

const ICON_STYLE: ImageStyle = {
  width: 24,
  height: 24,
  resizeMode: "contain",
  tintColor: isLiquidGlassSupported ? color.text : "lightgrey",
  opacity: 0.9,
}
const CONTAINER: ViewStyle = {
  justifyContent: "center",
}

export const MenuIcon = function CalendarIcon(props: { style?: ViewStyle }) {
  const { style } = props

  if (isLiquidGlassSupported) {
    return <Image source={menuIcon} style={[ICON_STYLE, { width: 20, height: 20 }]} />
  }

  return (
    <TouchableOpacity style={[CONTAINER, style]} accessibilityRole="button" accessibilityLabel={translate("routes.routeActions")}>
      <Image source={menuIcon} style={[ICON_STYLE]} />
    </TouchableOpacity>
  )
}
