import { Dimensions, Pressable, Animated as RNAnimated, TextStyle, ViewStyle } from "react-native"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { Text } from "../"
import { color, spacing } from "../../theme"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"

const AnimatedTouchable = RNAnimated.createAnimatedComponent(TouchableScale)

const ROUTE_DETAILS_STATION_TEXT: TextStyle = {
  color: color.text,
  opacity: 0.8,
  textAlign: "center",
  fontWeight: "600",
  fontSize: 14,
}

const LIQUID_GLASS_STYLE: ViewStyle = {
  width: Dimensions.get("screen").width / 2 - spacing[2] * 2,
  padding: spacing[2],
  borderRadius: 25,
}

interface RouteStationNameButtonProps extends TouchableScaleProps {
  disabled: boolean
  onPress: () => void
  name: string
  buttonScale: RNAnimated.Value
}

export function RouteStationNameButton(props: RouteStationNameButtonProps) {
  const { disabled, onPress, name, style, buttonScale, ...rest } = props

  if (isLiquidGlassSupported) {
    return (
      <Pressable onPress={onPress}>
        <LiquidGlassView interactive tintColor={color.secondaryLighter} style={LIQUID_GLASS_STYLE}>
          <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
            {name}
          </Text>
        </LiquidGlassView>
      </Pressable>
    )
  }

  return (
    <AnimatedTouchable
      friction={9}
      activeScale={0.95}
      disabled={disabled}
      onPress={onPress}
      style={[style, { transform: [{ scale: buttonScale }] }]}
      {...rest}
    >
      <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
        {name}
      </Text>
    </AnimatedTouchable>
  )
}
