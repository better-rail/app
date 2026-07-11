import * as React from "react"
import { Image, ImageBackground, View, ViewStyle, ImageStyle, Appearance } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import LinearGradient from "react-native-linear-gradient"
import { Text } from "@/components/text/text"
import { stationsObject, stationLocale } from "@/data/stations"

const arrowIcon = require("../../../assets/arrow-left.png")

const colorScheme = Appearance.getColorScheme()

export interface RouteDetailsProps {
  originId: string
  destinationId: string
  style?: ViewStyle
  imageStyle: ImageStyle
}

/**
 * Describe your component here
 */
export const RouteDetails = function RouteDetails(props: RouteDetailsProps) {
  const { originId, destinationId, imageStyle, style } = props

  const originName = stationsObject[originId][stationLocale]
  const destinationName = stationsObject[destinationId][stationLocale]

  return (
    <View>
      <ImageBackground source={stationsObject[originId].image} style={[styles.imageBackground, imageStyle]}>
        <LinearGradient
          style={styles.gradient}
          colors={[colorScheme === "dark" ? "rgba(0, 0, 0, .5)" : "rgba(0, 0, 0, .25)", "rgba(0, 0, 0, 0)"]}
        />
      </ImageBackground>

      <View style={styles.contentWrapper}>
        <View style={[styles.routeDetailsWrapper, style]}>
          <View style={[styles.routeDetailsStation, styles.routeDetailsStationOrigin]}>
            <Text style={styles.routeDetailsStationText} maxFontSizeMultiplier={1.1}>
              {originName}
            </Text>
          </View>
          <View style={styles.routeInfoCircle}>
            <Image source={arrowIcon} style={styles.arrowIcon} />
          </View>
          <View style={styles.routeDetailsStation}>
            <Text style={styles.routeDetailsStationText} maxFontSizeMultiplier={1.1}>
              {destinationName}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  imageBackground: {
    width: "100%",
    height: 200,
    zIndex: 0,
  },
  gradient: {
    height: "100%",
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    opacity: 1,
  },
  contentWrapper: {
    top: -20,
    marginBottom: -30,
    zIndex: 5,
  },
  routeDetailsWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  routeDetailsStation: {
    flex: 1,
    padding: theme.spacing[2],

    backgroundColor: theme.colors.secondaryLighter,
    borderRadius: 25,

    shadowOffset: { width: 0, height: 1 },
    shadowColor: theme.colors.dim,
    shadowRadius: 1,
    shadowOpacity: rt.colorScheme === "dark" ? 0 : 0.45,
    elevation: 1,
    zIndex: 0,
  },
  routeDetailsStationOrigin: {
    marginEnd: theme.spacing[5],
  },
  routeDetailsStationText: {
    color: theme.colors.text,
    opacity: 0.8,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
  routeInfoCircle: {
    width: 34,
    height: 34,
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.secondary,
    borderRadius: 25,
    elevation: 1,
    zIndex: 5,
  },
  arrowIcon: {
    width: 15,
    height: 15,
    tintColor: theme.colors.whiteText,
    transform: rt.rtl ? undefined : [{ rotate: "180deg" }],
  },
}))
