import * as React from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { Svg, Line } from "react-native-svg"
import { color, spacing, typography } from "../../theme"
import { Text } from "../"

const CONTAINER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",

  paddingVertical: spacing[2],
  paddingHorizontal: spacing[4],
  backgroundColor: color.secondaryBackground,
  borderRadius: 12,
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

const DASHED_LINED: ViewStyle = {
  flex: 1,
  marginHorizontal: spacing[3],
  borderWidth: 1,
  borderColor: color.primary,
  borderStyle: "dotted",
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
        <Text style={TEXT} allowFontScaling={false}>
          יציאה
        </Text>
        <Text style={TIME_TEXT} allowFontScaling={false}>
          08:30
        </Text>
      </View>

      <DashedLine />

      <View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 16, marginBottom: -2 }} allowFontScaling={false}>
            42 דק'
          </Text>
          <Text style={{ fontSize: 14 }} maxFontSizeMultiplier={1.1}>
            ללא החלפות
          </Text>
        </View>
      </View>

      <DashedLine />

      <View style={{ alignItems: "flex-end", marginStart: 12 }}>
        <Text style={TEXT} allowFontScaling={false}>
          הגעה
        </Text>
        <Text style={TIME_TEXT} allowFontScaling={false}>
          09:13
        </Text>
      </View>
    </View>
  )
})

const DashedLine = () => (
  <Svg height={5} width={50}>
    <Line stroke={color.primaryLighter} strokeWidth="4" strokeDasharray="5,5" x1="0" y1="0" x2="100%" y2={0} />
  </Svg>
)
