import React, { useMemo } from "react"
import { View, Image, ViewStyle, Dimensions } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text, ChangeDirectionButton } from "@/components"
import { color, spacing, fontScale } from "@/theme"
import { intervalToDuration, formatDuration, addMinutes, millisecondsToMinutes, milliseconds, Duration } from "date-fns"
import { dateFnsLocalization, translate } from "@/i18n"
import { Train } from "@/services/api"

const importantIcon = require("../../../../assets/important.png")
const clockIcon = require("../../../../assets/clock.png")
const infoIcon = require("../../../../assets/info.png")

const { width: deviceWidth } = Dimensions.get("screen")

// Hide the exchange icon when font scaling is on or if the viewport is too narrow,
// since it might make the station name overflow
const DISPLAY_EXCHANGE_ICON = fontScale < 1.1 && deviceWidth >= 360

const SAFE_DURATION_MINS = 3

type RouteExchangeProps = {
  stationName: string
  arrivalPlatform: number
  departurePlatform: number
  firstTrain: Train
  secondTrain: Train
  style?: ViewStyle
}

export const RouteExchangeDetails = (props: RouteExchangeProps) => {
  const { stationName, arrivalPlatform, departurePlatform, firstTrain, secondTrain, style } = props

  const platformDetailText = useMemo(() => {
    if (arrivalPlatform === departurePlatform) {
      return `${translate("routeDetails.platformStay")} ${arrivalPlatform}`
    } else {
      return `${translate("routeDetails.platformChange")} ${departurePlatform}`
    }
  }, [])

  const exchangeDuration = useMemo(() => {
    const arrivalTime = addMinutes(firstTrain.arrivalTime, firstTrain.delay)
    const departureTime = addMinutes(secondTrain.departureTime, secondTrain.delay)

    if (arrivalTime >= departureTime) {
      return intervalToDuration({ start: 0, end: 1000 * 60 })
    }

    return intervalToDuration({ start: arrivalTime, end: departureTime })
  }, [])

  const exchangeDurationText = useMemo(() => {
    return formatDuration(exchangeDuration, { locale: dateFnsLocalization })
  }, [exchangeDuration])

  const isExchangeSafe = useMemo(() => {
    const exchangeMs = milliseconds(exchangeDuration)
    return millisecondsToMinutes(exchangeMs) >= SAFE_DURATION_MINS
  }, [exchangeDuration])

  return (
    <View style={[styles.wrapper, style]}>
      {DISPLAY_EXCHANGE_ICON && <ChangeDirectionButton buttonStyle={styles.icon} />}
      <View>
        <Text style={styles.stationName}>
          {translate("routeDetails.changeAt")}
          {stationName}
        </Text>
        <View style={styles.infoWrapper}>
          <View style={[styles.infoDetailWrapper, { marginBottom: spacing[1] }]}>
            <Image style={styles.infoIcon} source={importantIcon} />
            <Text style={styles.infoText}>{platformDetailText}</Text>
          </View>
          <View
            style={[styles.infoDetailWrapper, { marginBottom: isExchangeSafe ? (fontScale > 1 ? spacing[3] : 0) : spacing[1] }]}
          >
            <Image style={styles.infoIcon} source={clockIcon} />
            <Text style={styles.infoText}>
              {translate("routeDetails.waitingTime")} {exchangeDurationText}
            </Text>
          </View>
          {!isExchangeSafe && (
            <View style={[styles.infoDetailWrapper, { marginBottom: fontScale > 1 ? spacing[3] : 0 }]}>
              <Image style={[styles.infoIcon, { tintColor: color.error }]} source={infoIcon} />
              <Text style={[styles.infoText, { color: color.error }]} preset="bold">
                {translate("routeDetails.unsafeChange")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing[4],
    backgroundColor: theme.colors.secondaryLighter,
  },
  icon: {
    marginHorizontal: theme.spacing[4],
    transform: [{ rotate: "90deg" }, { scale: 0.95 }],
    shadowOpacity: 0,
    elevation: 0,
  },
  infoWrapper: {
    alignItems: DISPLAY_EXCHANGE_ICON ? "flex-start" : "center",
  },
  stationName: {
    maxWidth: DISPLAY_EXCHANGE_ICON ? "85%" : "100%",
    marginBottom: theme.spacing[1],
    fontSize: 18,
    fontWeight: "700",
    textAlign: DISPLAY_EXCHANGE_ICON ? "left" : "center",
  },
  infoDetailWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 16,
  },
  infoIcon: {
    width: 25,
    height: 25,
    marginEnd: 5,
    opacity: 1,
  },
}))
