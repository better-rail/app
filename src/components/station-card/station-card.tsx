/* eslint-disable react-native/no-inline-styles */

import * as React from "react"
import {
  ImageBackground,
  View,
  Platform,
  Dimensions,
  ImageSourcePropType,
  ViewStyle,
  Image,
  Appearance,
} from "react-native"
import { StyleSheet } from "react-native-unistyles"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import LinearGradient from "react-native-linear-gradient"
import { color } from "@/theme"
import { Text } from "@/components/text/text"
import { isLiquidGlassSupported } from "@callstack/liquid-glass"

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

export interface StationCardProps extends TouchableScaleProps {
  name: string
  image: ImageSourcePropType
  style?: ViewStyle
}
export function StationCard(props: StationCardProps) {
  const { name, image, style, ...rest } = props

  if (!name) {
    return (
      <TouchableScale style={[styles.container, style]} activeScale={0.95} friction={9} {...rest}>
        <View style={styles.emptyCardWrapper}>
          <Image source={require("../../../assets/railway-station.png")} style={styles.emptyCardImage} />
          <Text style={styles.emptyCardText} tx="plan.selectStation" />
        </View>
      </TouchableScale>
    )
  }

  if (!image) {
    return (
      <TouchableScale style={[styles.container, styles.imagelessCard, style]} activeScale={0.95} friction={9} {...rest}>
        <LinearGradient
          style={styles.gardient}
          end={{ x: 1, y: 0 }}
          start={{ x: 0, y: 0 }}
          colors={[Platform.select({ ios: color.secondaryLighter, android: "#f6eae3" }), "#ffd9c2"]}
        />
        <LinearGradient style={styles.gardient} colors={["rgba(0, 0, 0, 0.05)", "rgba(0, 0, 0, 0.3)"]} />

        <Text style={styles.text}>{name}</Text>
      </TouchableScale>
    )
  }

  return (
    <TouchableScale style={[styles.container, style]} activeScale={0.95} friction={9} {...rest}>
      <ImageBackground imageStyle={styles.imageBackgroundImage} source={image} style={styles.background}>
        <LinearGradient
          style={styles.gardient}
          colors={["rgba(0, 0, 0, 0.05)", isDarkMode ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.65)"]}
        />

        <Text style={styles.text}>{name}</Text>
      </ImageBackground>
    </TouchableScale>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    borderRadius: 12,
    backgroundColor: theme.colors.inputPlaceholderBackground,
    shadowColor: theme.colors.palette.black,
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.2,
    elevation: 3,
  },
  imagelessCard: {
    height: cardHeight,
    justifyContent: "flex-end",
  },
  emptyCardWrapper: {
    width: "100%",
    height: cardHeight,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  emptyCardImage: {
    width: 48,
    height: 48,
    marginBottom: theme.spacing[2],
    tintColor: theme.colors.dim,
  },
  background: {
    width: "100%",
    height: cardHeight,
    justifyContent: "flex-end",
  },
  imageBackgroundImage: {
    borderRadius: isLiquidGlassSupported ? 14 : 6,
  },
  text: {
    marginStart: theme.spacing[3],
    marginBottom: theme.spacing[2],
    color: theme.colors.palette.white,
    fontFamily: theme.typography.primary,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "left",
    textShadowColor: theme.colors.palette.black,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  emptyCardText: {
    color: theme.colors.dim,
  },
  gardient: {
    height: "100%",
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    opacity: 1,
    borderRadius: isLiquidGlassSupported ? 12 : 6,
  },
}))
