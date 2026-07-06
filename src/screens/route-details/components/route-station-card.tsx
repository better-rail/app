import React from "react"
import { View, ViewStyle, Image } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"

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

  style?: ViewStyle
}

export const RouteStationCard = (props: RouteStopCardProps) => {
  const { stationName, stopTime, platform, trainNumber, delay, delayedTime, lastStop, style } = props

  return (
    <View style={[styles.routeStationWrapper, style]}>
      <View style={styles.routeStationTimeWrapper}>
        {delayedTime ? (
          <>
            <Text style={[styles.routeStationTime, styles.routeStationTimeDelayed]} maxFontSizeMultiplier={1.1}>
              {stopTime}
            </Text>
            <Text style={[styles.routeStationTime, { minWidth: undefined }]} maxFontSizeMultiplier={1.1}>
              {delayedTime}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.routeStationTime} maxFontSizeMultiplier={1.1}>
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
          {platform === 0 ? translate("routeDetails.noPlatformSet") : `${translate("routeDetails.platform")} ${platform}`}{" "}
          {trainNumber && `· ${translate("routeDetails.trainNo")} ${trainNumber}`}
        </Text>
        {trainNumber && (
          <Text style={styles.lastDestinationText} maxFontSizeMultiplier={1.2}>
            {translate("routeDetails.lastStop")}: {lastStop}
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
  routeStationTime: {
    minWidth: 52 * rt.fontScale,
    marginEnd: theme.spacing[4],
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "System",
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
    fontSize: 17,
    fontWeight: "700",
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
  railwayIcon: {
    width: 42.5,
    height: 42.5,
  },
}))
