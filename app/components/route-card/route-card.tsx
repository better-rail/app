import React, { useMemo } from "react"
import { TextStyle, View, ViewStyle, Dimensions, Platform } from "react-native"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { Svg, Line } from "react-native-svg"
import { color, spacing, typography, fontScale } from "../../theme"
import { primaryFontIOS } from "../../theme/typography"
import { Text } from "../"
import { format, intervalToDuration, formatDuration } from "date-fns"
import { dateDelimiter, dateFnsLocalization, translate } from "../../i18n"
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
  estTime: string
  stops: number
  delay: number
  bounceable?: boolean
  style?: ViewStyle
}

/**
 * Describe your component here
 */
export const RouteCard = React.memo(function RouteCard(props: RouteCardProps) {
  const { departureTime, arrivalTime, estTime, stops, delay, onPress = null, bounceable = true, style } = props

  // Format times
  const [formattedDepatureTime, formattedArrivalTime] = useMemo(() => {
    const formattedDepatureTime = format(new Date(departureTime), "HH:mm")
    const formattedArrivalTime = format(new Date(arrivalTime), "HH:mm")

    return [formattedDepatureTime, formattedArrivalTime]
  }, [departureTime, arrivalTime])

  const duration = useMemo(() => {
    const estTimeParts = estTime.split(":") // The estTime value is formatted like '00:42:00'
    const [hours, minutes] = estTimeParts.map((value) => parseInt(value)) // Grab the hour & minutes values
    const durationInMilliseconds = (hours * 60 * 60 + minutes * 60) * 1000 //  Convert to milliseconds
    const durationObject = intervalToDuration({ start: 0, end: durationInMilliseconds }) // Create a date-fns duration object
    const formattedDuration = formatDuration(durationObject, { delimiter: dateDelimiter, locale: dateFnsLocalization }) // Format the duration

    if (formattedDuration.length > 7 && deviceWidth < 410) dashedLineWidth = 0

    return formattedDuration
  }, [estTime])

  const stopsText = useMemo(() => {
    if (stops === 0) return translate("routes.noExchange")
    if (stops === 1) return translate("routes.oneExchange")
    return `${stops} ${translate("routes.exchanges")}`
  }, [stops])

  return (
    <TouchableScale onPress={onPress} activeScale={bounceable ? 0.95 : 1} friction={9} style={[CONTAINER, style]}>
      <View style={{ marginEnd: 6 }}>
        <Text style={TIME_TYPE_TEXT} tx="routes.departure" />
        <Text style={TIME_TEXT}>{formattedDepatureTime}</Text>
      </View>

      <DashedLine />

      <View>
        <View style={{ alignItems: "center" }}>
          <Text style={DURATION_TEXT}>{duration}</Text>

          {delay > 0 ? <DelayBadge delay={delay} /> : <Text style={{ fontSize: 14 }}>{stopsText}</Text>}
        </View>
      </View>

      <DashedLine />

      <View style={{ alignItems: "flex-end", marginStart: 12 }}>
        <Text style={TIME_TYPE_TEXT} tx="routes.arrival" />
        <Text style={TIME_TEXT}>{formattedArrivalTime}</Text>
      </View>
    </TouchableScale>
  )
})

const { width: deviceWidth } = Dimensions.get("screen")

// Remove dashed line for users with scaled font size
let dashedLineWidth = 50

if (fontScale > 1.2) {
  dashedLineWidth = 0
}

if (deviceWidth <= 360) {
  dashedLineWidth = 0
}

const DashedLine = () => (
  <Svg height={5} width={dashedLineWidth}>
    <Line stroke={color.dim} strokeWidth={4} strokeDasharray="5,5" x1="0" y1="0" x2="100%" y2={0} />
  </Svg>
)
