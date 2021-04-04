/* eslint-disable react-native/no-inline-styles */

import * as React from "react"
import { ImageBackground, TextStyle, ImageSourcePropType, ViewStyle } from "react-native"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import LinearGradient from "react-native-linear-gradient"
import { observer } from "mobx-react-lite"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"

const CONTAINER: ViewStyle = {
  borderRadius: 6,
  shadowColor: color.palette.black,
  shadowOffset: { height: 1, width: 0 },
  shadowOpacity: 0.25,
}

const BACKGROUND: ViewStyle = {
  width: "100%",
  height: 137.5,
  justifyContent: "flex-end",
}

const TEXT: TextStyle = {
  marginRight: spacing[3],
  marginBottom: spacing[2],
  color: color.palette.white,
  fontFamily: typography.primary,
  fontSize: 22,
  fontWeight: "700",
  textShadowColor: color.palette.black,
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
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
  /**
   * The station name to display on the card.
   */
  name: string
  /**
   * The image to use as the card's background.
   */
  image: ImageSourcePropType
  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle
}

/**
 * Describe your component here
 */
export const StationCard = observer(function StationCard(props: StationCardProps) {
  const { name, image, style, ...rest } = props

  return (
    <TouchableScale style={[CONTAINER, style]} activeScale={0.94} friction={7} {...rest}>
      <ImageBackground imageStyle={{ borderRadius: 6 }} source={image} style={BACKGROUND}>
        <LinearGradient style={GARDIENT} colors={["rgba(0, 0, 0, 0.05)", "rgba(0, 0, 0, 0.75)"]} />

        <Text style={TEXT}>{name}</Text>
      </ImageBackground>
    </TouchableScale>
  )
})
