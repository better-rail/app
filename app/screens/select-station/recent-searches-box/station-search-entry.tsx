import React from "react"
import { View, Image, ViewStyle, ImageStyle, ImageSourcePropType } from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../../../components"
import { spacing, color } from "../../../theme"

const SEARCH_ENTRY_WRAPPER: ViewStyle = {
  alignItems: "center",
  marginEnd: spacing[3],
}

const SEARCH_ENTRY_IMAGE_WRAPPER: ViewStyle = {
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.dim,
  shadowRadius: 3,
  shadowOpacity: 0.5,
}

const SEARCH_ENTRY_IMAGE: ImageStyle = {
  width: 175,
  height: 125,
  marginBottom: spacing[1],
  borderRadius: 6,
}

type StationSearchEntryProps = {
  image: ImageSourcePropType
  name: string
  onPress: () => void
}

export const StationSearchEntry = (props: StationSearchEntryProps) => (
  <TouchableScale onPress={props.onPress} activeScale={0.96} friction={8} style={SEARCH_ENTRY_WRAPPER}>
    <View style={SEARCH_ENTRY_IMAGE_WRAPPER}>
      <Image source={props.image} style={SEARCH_ENTRY_IMAGE} />
    </View>
    <Text>{props.name}</Text>
  </TouchableScale>
)
