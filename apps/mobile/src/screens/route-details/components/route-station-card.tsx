import React from "react"
import { View, ViewStyle, Image } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { subheadingFontStyle } from "@/theme/theme-fonts"

const railwayStationIcon = require("../../../../assets/railway-station.png")

type RouteStopCardProps = {
  stationName: string
  stopTime: string
  platform?: number
  trainNumber?: number
  lastStop?: string

  /**
   * The delay time in full minutes, e.g. 5, 8, 10
   */
  delay?: number

  /**
   * The stop time, updated with the delay minutes
   */
  delayedTime?: string

  /**
   * The live platform differs from the scheduled one
   */
  platformChanged?: boolean

  /**
   * The train's last stop differs from the scheduled one
   */
  lastStopChanged?: boolean

  style?: ViewStyle
}

export const RouteStationCard = (props: RouteStopCardProps) => {
  const { stationName, stopTime, platform, trainNumber, delay, delayedTime, lastStop, platformChanged, lastStopChanged, style } =
    props

  const platformText =
    platform === 0 ? translate("routeDetails.noPlatformSet") : `${translate("routeDetails.platform")} ${platform}`

  return (
    <View style={[styles.routeStationWrapper, style]}>
      <View style={styles.routeStationTimeWrapper}>
        {delayedTime ? (
          <>
            <Text
              style={[styles.routeStationTime, styles.routeStationTimeDelayed]}
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {stopTime}
            </Text>
            <Text
              style={[styles.routeStationTime, { minWidth: undefined }]}
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {delayedTime}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.routeStationTime} maxFontSizeMultiplier={1.1} numberOfLines={1} adjustsFontSizeToFit>
              {stopTime}
            </Text>
            {delay > 0 && (
              <Text style={styles.routeDelayTime} maxFontSizeMultiplier={1.1}>
                + {delay} {translate("routeDetails.minutes")}
              </Text>
            )}
          </>
        )}
      </View>

      <Image style={styles.railwayIcon} source={railwayStationIcon} />

      <View style={styles.routeStationDetails}>
        <Text style={styles.routeStationName} maxFontSizeMultiplier={1.25}>
          {stationName}
        </Text>
        <Text style={styles.routeStationDetailsText} maxFontSizeMultiplier={1.2}>
          <Text
            style={[styles.routeStationDetailsText, platformChanged && styles.realtimeChangeText]}
            maxFontSizeMultiplier={1.2}
          >
            {platformText}
          </Text>{" "}
          {trainNumber && `· ${translate("routeDetails.trainNo")} ${trainNumber}`}
        </Text>
        {trainNumber && (
          <Text style={styles.lastDestinationText} maxFontSizeMultiplier={1.2}>
            {`${translate("routeDetails.lastStop")}: `}
            <Text style={[styles.lastDestinationText, lastStopChanged && styles.realtimeChangeText]} maxFontSizeMultiplier={1.2}>
              {lastStop}
            </Text>
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  routeStationWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[6] + 8,
    paddingEnd: theme.spacing[2],
    backgroundColor: theme.colors.secondaryBackground,
    zIndex: 100,
  },
  routeStationTimeWrapper: {
    flex: 0.4,
    alignItems: rt.fontScale > 1.2 ? "flex-start" : "flex-end",
  },
  routeStationDetails: {
    flex: 1,
    marginStart: theme.spacing[4],
  },
  // "12:09 PM" is wider than the column, so the text scales down instead of wrapping
  routeStationTime: {
    minWidth: 52 * rt.fontScale,
    marginEnd: theme.spacing[4],
    // Skinned themes carry their route card times here; every key is set so a theme switch resets it
    color: theme.skin.stationTime?.color ?? theme.colors.text,
    textShadowColor: theme.skin.stationTime?.glow ?? "transparent",
    textShadowRadius: theme.skin.stationTime?.glow ? 6 : 0,
    ...(theme.skin.timeFont
      ? {
          fontFamily: theme.skin.timeFont.family,
          fontWeight: "normal",
          // Route card times are 24 where these are 18
          fontSize: theme.skin.timeFont.size * 0.75,
          letterSpacing: theme.skin.timeFont.letterSpacing ?? 0,
        }
      : { fontFamily: "System", fontWeight: "700", fontSize: 18, letterSpacing: 0 }),
  },
  routeStationTimeDelayed: {
    textDecorationLine: "line-through",
    fontSize: 12,
    textAlign: "right",
    opacity: 0.6,
  },
  routeDelayTime: {
    width: 70 * rt.fontScale,
    marginEnd: rt.rtl ? 0 : theme.spacing[3] * rt.fontScale,
    color: theme.colors.destroy,
    fontWeight: "bold",
  },
  routeStationName: {
    marginBottom: -1,
    marginEnd: theme.spacing[3],
    ...subheadingFontStyle(theme, 17),
  },
  routeStationDetailsText: {
    fontSize: 14,
    fontWeight: "400",
  },
  lastDestinationText: {
    fontSize: 14,
    fontWeight: "400",
    opacity: 0.8,
  },
  realtimeChangeText: {
    color: theme.colors.destroy,
    fontWeight: "700",
  },
  railwayIcon: {
    width: 42.5,
    height: 42.5,
    // The icon's own grey for the system look; themes with their own colors tint it
    tintColor: typeof theme.colors.primary === "string" ? theme.colors.primary : "#555555",
  },
}))
