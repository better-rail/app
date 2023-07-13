import { Image, ImageStyle, TouchableOpacity, ViewStyle } from "react-native"

const CalenderImageIcon = require("../../../assets/calendar.png")

const ICON_STYLE: ImageStyle = {
  width: 27,
  height: 25,
  resizeMode: "contain",
  tintColor: "lightgrey",
  opacity: 0.9,
}
const CONTAINER: ViewStyle = {
  justifyContent: "center",
}

export const CalendarIcon = function CalendarIcon(props: { style?: ViewStyle; onPress: () => void }) {
  const { onPress, style } = props

  return (
    <TouchableOpacity onPress={onPress} style={[CONTAINER, style]}>
      <Image source={CalenderImageIcon} style={[ICON_STYLE]} />
    </TouchableOpacity>
  )
}
