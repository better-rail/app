import { TouchableOpacity, Image, type ImageStyle, type ViewStyle } from "react-native"
import { translate } from "../../i18n"

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
    <TouchableOpacity onPress={onPress} style={[CONTAINER, style]} accessibilityLabel={translate("routeDetails.addToCalendar")}>
      <Image source={CalenderImageIcon} style={[ICON_STYLE]} />
    </TouchableOpacity>
  )
}
