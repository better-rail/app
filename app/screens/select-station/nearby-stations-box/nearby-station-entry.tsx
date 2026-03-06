import React from "react"
import { View, Image, Appearance, Platform } from "react-native"
import type { ViewStyle, ImageStyle, TextStyle, ImageSourcePropType } from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../../../components"
import { spacing, color } from "../../../theme"
import { formatDistance } from "../../../utils/distance"

const colorScheme = Appearance.getColorScheme()

const ENTRY_WRAPPER: ViewStyle = {
  alignItems: "center",
}

const IMAGE_WRAPPER: ViewStyle = {
  shadowOffset: { width: 0, height: 0 },
  shadowColor: "rgba(0,0,0,.3)",
  shadowRadius: 1.5,
  shadowOpacity: colorScheme === "light" ? 0.5 : 0,
  backgroundColor: color.inputPlaceholderBackground,
  borderRadius: Platform.select({ ios: 6, android: 4 }),
}

const ENTRY_IMAGE: ImageStyle = {
  width: 175,
  height: 125,
  borderRadius: Platform.select({ ios: 6, android: 4 }),
}

const ENTRY_TEXT: TextStyle = {
  marginTop: spacing[1],
}

const DISTANCE_TEXT: TextStyle = {
  fontSize: 12,
  color: color.dim,
}

const EMPTY_CARD_WRAPPER: ViewStyle = {
  width: 175,
  height: 125,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: Platform.select({ ios: 6, android: 4 }),
}

type NearbyStationEntryProps = {
  image: ImageSourcePropType
  name: string
  distance: number
  onPress: () => void
}

export const NearbyStationEntry = (props: NearbyStationEntryProps) => (
  <TouchableScale
    onPress={props.onPress}
    activeScale={0.96}
    friction={8}
    tension={Platform.select({ ios: 8, android: undefined })}
    style={ENTRY_WRAPPER}
  >
    <View style={IMAGE_WRAPPER}>
      {props.image ? (
        <Image source={props.image} style={ENTRY_IMAGE} />
      ) : (
        <View style={EMPTY_CARD_WRAPPER}>
          <Image
            source={require("../../../../assets/railway-station.png")}
            style={{ width: 48, height: 48, marginBottom: spacing[2], tintColor: color.dim }}
          />
        </View>
      )}
    </View>
    <Text style={ENTRY_TEXT}>{props.name}</Text>
    <Text style={DISTANCE_TEXT}>{formatDistance(props.distance)}</Text>
  </TouchableScale>
)
