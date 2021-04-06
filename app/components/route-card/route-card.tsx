import * as React from "react"
import { TextStyle, View, ViewStyle, PixelRatio } from "react-native"
import { observer } from "mobx-react-lite"
import { Svg, Line } from "react-native-svg"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"

const fontScale = PixelRatio.getFontScale()

const CONTAINER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",

  paddingVertical: spacing[2],
  paddingHorizontal: spacing[4],
  backgroundColor: color.secondaryBackground,
  borderRadius: 12,

  shadowColor: color.palette.black,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.05,
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

export interface RouteCardProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle
}

/**
 * Describe your component here
 */
export const RouteCard = observer(function RouteCard(props: RouteCardProps) {
  const { style } = props

  return (
    <View style={[CONTAINER, style]}>
      <View style={{ marginEnd: 6 }}>
        <Text style={TEXT}>יציאה</Text>
        <Text style={TIME_TEXT}>08:30</Text>
      </View>

      <DashedLine />

      <View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 16, marginBottom: -2 }}>42 דק'</Text>
          <Text style={{ fontSize: 14 }}>ללא החלפות</Text>
        </View>
      </View>

      <DashedLine />

      <View style={{ alignItems: "flex-end", marginStart: 12 }}>
        <Text style={TEXT}>הגעה</Text>
        <Text style={TIME_TEXT}>09:13</Text>
      </View>
    </View>
  )
})

// Remove dashed line for users with scaled font size
let dashedLineWidth = 50
let dashedStrokeWidth = 4

if (fontScale > 1.2) {
  dashedLineWidth = 30
  dashedStrokeWidth = 8
}

const DashedLine = () => (
  <Svg height={5} width={dashedLineWidth}>
    <Line stroke={color.primaryLighter} strokeWidth={dashedStrokeWidth} strokeDasharray="5,5" x1="0" y1="0" x2="100%" y2={0} />
  </Svg>
)
