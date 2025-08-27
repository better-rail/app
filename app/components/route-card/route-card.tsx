/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useMemo } from "react"
import { TextStyle, View, ViewStyle, Platform } from "react-native"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { Svg, Line } from "react-native-svg"
import { color, spacing, typography, fontScale } from "../../theme"
import { primaryFontIOS } from "../../theme/typography"
import { Text } from "../"
import { format } from "date-fns"
import { translate } from "../../i18n"
import { RouteIndicators } from "./"

// #region styles

// Setting static height for FlatList getItemLayout
export let RouteCardHeight = 75
if (fontScale > 1.1) RouteCardHeight = 85

const CONTAINER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  height: RouteCardHeight,

  paddingVertical: spacing[2],
  paddingHorizontal: spacing[4],
  backgroundColor: color.inputBackground,
  borderRadius: Platform.select({ ios: 12, android: 8 }),

  shadowColor: color.palette.black,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.05,
  elevation: 1,
}

const ACTIVE_RIDE_CONTAINER: ViewStyle = {
  backgroundColor: color.greenBackground,
  shadowOpacity: 0.15,
  elevation: 2,
}

const PAST_RIDE_CONTAINER: ViewStyle = {
  opacity: 0.4,
}

const TIME_TYPE_TEXT: TextStyle = {
  marginBottom: primaryFontIOS === "System" ? 1 : -2,
  fontFamily: typography.primary,
  fontSize: 14,
  fontWeight: "500",
  color: color.dim,
}

const TIME_TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontWeight: "700",
  fontSize: 24,
  color: color.text,
}

const DURATION_TEXT: TextStyle = {
  marginBottom: primaryFontIOS === "System" ? 2 : -2,
  fontSize: 16,
}

// #endregion

export interface RouteCardProps extends TouchableScaleProps {
  departureTime: number
  arrivalTime: number
  duration: string
  isMuchShorter: boolean
  isMuchLonger: boolean
  stops: number
  delay: number
  style?: ViewStyle
  isActiveRide: boolean
  shouldShowDashedLine?: boolean
  isRouteInThePast: boolean
  onLongPress?: () => void
}

export const RouteCard = function RouteCard(props: RouteCardProps) {
  const {
    departureTime,
    arrivalTime,
    duration,
    stops,
    delay,
    isMuchShorter,
    isMuchLonger,
    onPress = null,
    onLongPress = null,
    style,
    shouldShowDashedLine = true,
  } = props

  // Format times
  const [formattedDepatureTime, formattedArrivalTime] = useMemo(() => {
    const formattedDepatureTime = format(new Date(departureTime), "HH:mm")
    const formattedArrivalTime = format(new Date(arrivalTime), "HH:mm")

    return [formattedDepatureTime, formattedArrivalTime]
  }, [departureTime, arrivalTime])

  const stopsText = useMemo(() => {
    if (stops === 0) return translate("routes.noChange")
    if (stops === 1) return translate("routes.oneChange")
    return `${stops} ${translate("routes.changes")}`
  }, [stops])

  const isBloatedIndicators = isMuchShorter && !isMuchLonger && delay > 0

  return (
    <TouchableScale
      onPress={onPress}
      onLongPress={onLongPress}
      activeScale={0.95}
      friction={9}
      style={[CONTAINER, props.isActiveRide && ACTIVE_RIDE_CONTAINER, props.isRouteInThePast && PAST_RIDE_CONTAINER, style]}
    >
      <View style={{ marginEnd: spacing[3] }}>
        <Text style={TIME_TYPE_TEXT} tx="routes.departure" />
        <Text style={TIME_TEXT}>{formattedDepatureTime}</Text>
      </View>

      {shouldShowDashedLine && !isBloatedIndicators && <DashedLine />}

      <View style={{ marginHorizontal: spacing[1] }}>
        <View style={{ alignItems: "center", gap: spacing[0] }}>
          <Text style={DURATION_TEXT} maxFontSizeMultiplier={1}>
            {duration}
          </Text>

          <RouteIndicators
            isMuchShorter={isMuchShorter}
            isMuchLonger={isMuchLonger}
            delay={delay}
            stopsText={stopsText}
            isRideActive={props.isActiveRide}
          />
        </View>
      </View>

      {shouldShowDashedLine && !isBloatedIndicators && <DashedLine />}

      <View style={{ alignItems: "flex-end", marginStart: spacing[3] }}>
        <Text style={TIME_TYPE_TEXT} tx="routes.arrival" />
        <Text style={TIME_TEXT}>{formattedArrivalTime}</Text>
      </View>
    </TouchableScale>
  )
}

const DashedLine = () => (
  <Svg height={5} width={35}>
    <Line stroke={color.dim} strokeWidth={4} strokeDasharray="5,5" x1="0" y1="0" x2="100%" y2={0} />
  </Svg>
)
