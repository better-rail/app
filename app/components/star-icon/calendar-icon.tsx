import { observer } from "mobx-react-lite"
import { Image, ImageStyle, Platform, TouchableOpacity, ViewStyle } from "react-native"
const CalenderImageIcon = Platform.select({
  ios: require("../../../assets/calendar.ios.png"),
  android: require("../../../assets/calendar.png")
})
import React from "react"

export const CalendarIcon = observer(function CalendarIcon(props: {
  style?: ViewStyle
  onPress: () => void
}) {
  const { onPress, style } = props
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

  return (
    <TouchableOpacity onPress={ onPress } style={ [CONTAINER, style] }>
      <Image source={ CalenderImageIcon } style={ [ICON_STYLE] } />
    </TouchableOpacity>
  )
})
