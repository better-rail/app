import React from "react"
import { View, Image, ViewStyle, ImageStyle, ImageSourcePropType, Appearance } from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../../../components"
import { spacing, color } from "../../../theme"

const colorScheme = Appearance.getColorScheme()

const SEARCH_ENTRY_WRAPPER: ViewStyle = {
  alignItems: "center",
  marginEnd: spacing[3],
}

const SEARCH_ENTRY_IMAGE_WRAPPER: ViewStyle = {
  shadowOffset: { width: 0, height: 0 },
  shadowColor: "rgba(0,0,0,.3)",
  shadowRadius: 1.5,
  shadowOpacity: colorScheme === "light" ? 0.5 : 0,
  elevation: colorScheme === "light" ? 1 : 0,
}

const SEARCH_ENTRY_IMAGE: ImageStyle = {
  width: 175,
  height: 125,
  marginBottom: spacing[1],
  borderRadius: 6,
}

const EMPTY_CARD_WRAPPER: ViewStyle = {
  width: 175,
  height: 125,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing[1],
  borderRadius: 6,
  backgroundColor: color.inputPlaceholderBackground,
}

type StationSearchEntryProps = {
  image: ImageSourcePropType
  name: string
  onPress: () => void
}

export const StationSearchEntry = (props: StationSearchEntryProps) => (
  <TouchableScale onPress={props.onPress} activeScale={0.96} friction={8} style={SEARCH_ENTRY_WRAPPER}>
    <View style={SEARCH_ENTRY_IMAGE_WRAPPER}>
      {props.image ? (
        <Image source={props.image} style={SEARCH_ENTRY_IMAGE} />
      ) : (
        <View style={EMPTY_CARD_WRAPPER}>
          <Image
            source={require("../../../../assets/railway-station.png")}
            style={{ width: 48, height: 48, marginBottom: spacing[2], tintColor: color.dim }}
          />
        </View>
      )}
    </View>
    <Text>{props.name}</Text>
  </TouchableScale>
)
