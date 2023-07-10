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
import { translate, userLocale } from "../../i18n"
import { DelayBadge } from "./delay-badge"

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
const SHORT_ROUTE_BADGE: ViewStyle = {
  marginTop: Platform.OS === "ios" ? (userLocale === "he" ? 4 : 2) : 6,
  paddingVertical: 1,
  paddingHorizontal: 8,
  backgroundColor: color.greenBackground,
  borderRadius: 6,
}

const SHORT_ROUTE_BADGE_TEXT: TextStyle = {
  fontSize: 14,
  color: color.greenText,
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
}

/**
 * Describe your component here
 */
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

  return (
    <TouchableScale
      onPress={onPress}
      activeScale={0.95}
      friction={9}
      style={[CONTAINER, props.isActiveRide && ACTIVE_RIDE_CONTAINER, style]}
    >
      <View style={{ marginEnd: spacing[3] }}>
        <Text style={TIME_TYPE_TEXT} tx="routes.departure" />
        <Text style={TIME_TEXT}>{formattedDepatureTime}</Text>
      </View>

      {shouldShowDashedLine && <DashedLine />}

      <View style={{ marginHorizontal: spacing[1] }}>
        <View style={{ alignItems: "center" }}>
          <Text style={DURATION_TEXT} maxFontSizeMultiplier={1}>
            {duration}
          </Text>

          {isMuchShorter && !isMuchLonger ? (
            <View style={SHORT_ROUTE_BADGE}>
              <Text style={SHORT_ROUTE_BADGE_TEXT} tx="routes.shortRoute" />
            </View>
          ) : delay > 0 ? (
            <DelayBadge delay={delay} />
          ) : (
            <Text style={{ fontSize: 14 }} maxFontSizeMultiplier={1}>
              {stopsText}
            </Text>
          )}
        </View>
      </View>

      {shouldShowDashedLine && <DashedLine />}

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
