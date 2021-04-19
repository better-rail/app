import React, { useMemo } from "react"
import { TextStyle, View, ViewStyle, Dimensions, PixelRatio } from "react-native"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { Svg, Line } from "react-native-svg"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"
import { format, intervalToDuration, formatDuration } from "date-fns"
import { he } from "date-fns/locale"

// #region styles

const fontScale = PixelRatio.getFontScale()

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
  borderRadius: 12,

  shadowColor: color.palette.black,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.05,
  elevation: 1,
}

const TEXT: TextStyle = {
  marginBottom: -2,
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

// #endregion

export interface RouteCardProps extends TouchableScaleProps {
  departureTime: number
  arrivalTime: number
  estTime: string
  stops: number
  bounceable?: boolean
  style?: ViewStyle
}

/**
 * Describe your component here
 */
export const RouteCard = React.memo(function RouteCard(props: RouteCardProps) {
  const { departureTime, arrivalTime, estTime, stops, onPress = null, bounceable = true, style } = props

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
    const formattedDuration = formatDuration(durationObject, { delimiter: " ו- ", locale: he }) // Format the duration

    if (formattedDuration.length > 7) dashedLineWidth = 0

    return formattedDuration
  }, [estTime])

  const stopsText = useMemo(() => {
    if (stops === 0) return "ללא החלפות"
    if (stops === 1) return "החלפה אחת"
    return `${stops} החלפות`
  }, [stops])

  return (
    <TouchableScale onPress={onPress} activeScale={bounceable ? 0.95 : 1} friction={9} style={[CONTAINER, style]}>
      <View style={{ marginEnd: 6 }}>
        <Text style={TEXT}>יציאה</Text>
        <Text style={TIME_TEXT}>{formattedDepatureTime}</Text>
      </View>

      <DashedLine />

      <View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 16, marginBottom: -2 }}>{duration}</Text>
          <Text style={{ fontSize: 14 }}>{stopsText}</Text>
        </View>
      </View>

      <DashedLine />

      <View style={{ alignItems: "flex-end", marginStart: 12 }}>
        <Text style={TEXT}>הגעה</Text>
        <Text style={TIME_TEXT}>{formattedArrivalTime}</Text>
      </View>
    </TouchableScale>
  )
})

const { width: deviceWidth } = Dimensions.get("screen")

// Remove dashed line for users with scaled font size
let dashedLineWidth = 50
let dashedStrokeWidth = 4

if (fontScale > 1.2) {
  dashedLineWidth = 30
  dashedStrokeWidth = 8
}

if (deviceWidth <= 360) {
  dashedLineWidth = 0
}

const DashedLine = () => (
  <Svg height={5} width={dashedLineWidth}>
    <Line stroke={color.dim} strokeWidth={dashedStrokeWidth} strokeDasharray="5,5" x1="0" y1="0" x2="100%" y2={0} />
  </Svg>
)
