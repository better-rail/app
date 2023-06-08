/* eslint-disable react-native/no-inline-styles */

import * as React from "react"
import {
  ImageBackground,
  View,
  Platform,
  Dimensions,
  TextStyle,
  ImageSourcePropType,
  ViewStyle,
  Image,
  Appearance,
} from "react-native"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import LinearGradient from "react-native-linear-gradient"
import { observer } from "mobx-react-lite"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"

const isDarkMode = Appearance.getColorScheme() === "dark"
const { height: deviceHeight } = Dimensions.get("screen")

export let cardHeight = 120

if (deviceHeight > 600) {
  cardHeight = 135
}

if (deviceHeight > 730) {
  cardHeight = 157.5
}

if (deviceHeight > 780) {
  cardHeight = 178.5
}

if (deviceHeight > 900) {
  cardHeight = 190
}

const CONTAINER: ViewStyle = {
  borderRadius: 12,
  backgroundColor: color.inputPlaceholderBackground,
  shadowColor: color.palette.black,
  shadowOffset: { height: 1, width: 0 },
  shadowOpacity: 0.2,
  elevation: 3,
}

const EMPTY_CARD_WRAPPER: ViewStyle = {
  width: "100%",
  height: cardHeight,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 12,
}

const BACKGROUND: ViewStyle = {
  width: "100%",
  height: cardHeight,
  justifyContent: "flex-end",
}

const TEXT: TextStyle = {
  marginStart: spacing[3],
  marginBottom: spacing[2],
  color: color.palette.white,
  fontFamily: typography.primary,
  fontSize: 22,
  fontWeight: "700",
  textAlign: "left",
  textShadowColor: color.palette.black,
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
}

const EMPTY_CARD_TEXT: TextStyle = {
  color: color.dim,
}

const GARDIENT: ViewStyle = {
  height: "100%",
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  opacity: 1,
  borderRadius: 6,
}

export interface StationCardProps extends TouchableScaleProps {
  name: string
  image: ImageSourcePropType
  style?: ViewStyle
}
export const StationCard = observer(function StationCard(props: StationCardProps) {
  const { name, image, style, ...rest } = props

  if (!name) {
    return (
      <TouchableScale style={[CONTAINER, style]} activeScale={0.95} friction={9} {...rest}>
        <View style={EMPTY_CARD_WRAPPER}>
          <Image
            source={require("../../../assets/railway-station.png")}
            style={{ width: 48, height: 48, marginBottom: spacing[2], tintColor: color.dim }}
          />
          <Text style={EMPTY_CARD_TEXT} tx="plan.selectStation" />
        </View>
      </TouchableScale>
    )
  }

  if (!image) {
    return (
      <TouchableScale
        style={[CONTAINER, { height: cardHeight, justifyContent: "flex-end" }, style]}
        activeScale={0.95}
        friction={9}
        {...rest}
      >
        <LinearGradient
          style={GARDIENT}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          colors={[Platform.select({ ios: color.secondaryLighter, android: "#f6eae3" }), "#ffd9c2"]}
        />
        <LinearGradient style={GARDIENT} colors={["rgba(0, 0, 0, 0.05)", "rgba(0, 0, 0, 0.3)"]} />

        <Text style={TEXT}>{name}</Text>
      </TouchableScale>
    )
  }

  return (
    <TouchableScale style={[CONTAINER, style]} activeScale={0.95} friction={9} {...rest}>
      <ImageBackground imageStyle={{ borderRadius: Platform.select({ ios: 6, android: 3 }) }} source={image} style={BACKGROUND}>
        <LinearGradient
          style={GARDIENT}
          colors={["rgba(0, 0, 0, 0.05)", isDarkMode ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.65)"]}
        />

        <Text style={TEXT}>{name}</Text>
      </ImageBackground>
    </TouchableScale>
  )
})
