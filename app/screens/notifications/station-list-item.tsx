import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { Text } from "../../components"
import { color } from "../../theme"
import TouchableScale from "react-native-touchable-scale"
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated"

const WRAPPER: ViewStyle = {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  padding: 12,
  backgroundColor: color.secondaryBackground,
  borderRadius: 12,
  shadowColor: "#333",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
  elevation: 1,
}

const IMAGE_WRAPPER: ViewStyle = {
  justifyContent: "center",
  alignItems: "center",
  width: 40,
  height: 40,
  borderRadius: 50,
  shadowColor: "#333",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
  elevation: 3,
}

const STATION_IMAGE: ImageStyle = {
  width: 40,
  height: 40,
  borderRadius: 50,
}

const CHECKMARK_IMAGE: ImageStyle = {
  position: "absolute",
  right: 7.5,
  top: 7.5,
  width: 25,
  height: 25,
  borderRadius: 50,
  zIndex: 1,
  tintColor: color.whiteText,
}

const TITLE: TextStyle = {
  fontSize: 18,
  fontWeight: "500",
}

const CHECKMARK = require("../../../assets/checkmark.png")

interface StationListItemProps {
  title: string
  image: any
  selected?: boolean
  onSelect?: () => void
}

export function StationListItem(props: StationListItemProps) {
  const { title, image, selected, onSelect } = props

  return (
    <TouchableScale style={WRAPPER} activeScale={0.97} friction={10} onPress={onSelect}>
      <View style={IMAGE_WRAPPER}>
        {selected && (
          <Animated.Image
            source={CHECKMARK}
            style={CHECKMARK_IMAGE}
            entering={ZoomIn.duration(150)}
            exiting={ZoomOut.duration(150)}
          />
        )}
        <Image source={image} style={[STATION_IMAGE, selected && { borderWidth: 3 }]} blurRadius={selected ? 10 : 0} />
      </View>
      <Text style={TITLE}>{title}</Text>
    </TouchableScale>
  )
}
