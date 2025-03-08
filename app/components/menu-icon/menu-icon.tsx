import { TouchableOpacity, Image, type ImageStyle, type ViewStyle } from "react-native"

const ICON_STYLE: ImageStyle = {
  width: 24,
  height: 24,
  resizeMode: "contain",
  tintColor: "lightgrey",
  opacity: 0.9,
}
const CONTAINER: ViewStyle = {
  justifyContent: "center",
}

export const MenuIcon = function CalendarIcon(props: { style?: ViewStyle }) {
  const { style } = props

  return (
    <TouchableOpacity style={[CONTAINER, style]}>
      <Image source={require("../../../assets/ellipsis.png")} style={[ICON_STYLE]} />
    </TouchableOpacity>
  )
}
