import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { Text } from "../../components"
import { color } from "../../theme"
import TouchableScale from "react-native-touchable-scale"

const WRAPPER: ViewStyle = {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  padding: 12,
  backgroundColor: color.secondaryBackground,
  borderRadius: 12,
}

const STATION_IMAGE: ImageStyle = {
  width: 40,
  height: 40,
  borderRadius: 50,
}

const TITLE: TextStyle = {
  fontSize: 18,
  fontWeight: "500",
}

const IMAGE = require("../../../assets/station-images/tlv-hashalom.jpg")

export function StationListItem() {
  return (
    <TouchableScale style={WRAPPER} activeScale={0.95} friction={12}>
      <Image source={IMAGE} style={STATION_IMAGE} />
      <Text style={TITLE}>Tel Aviv HaShalom</Text>
    </TouchableScale>
  )
}
