import { Animated as RNAnimated, TextStyle, ViewStyle } from "react-native"
import TouchableScale, { TouchableScaleProps } from "react-native-touchable-scale"
import { translate } from "../../i18n"
import { Text } from "../"
import { color, spacing } from "../../theme"

const AnimatedTouchable = RNAnimated.createAnimatedComponent(TouchableScale)

const ROUTE_DETAILS_STATION_TEXT: TextStyle = {
  color: color.text,
  opacity: 0.8,
  textAlign: "center",
  fontWeight: "600",
  fontSize: 14,
}

interface RouteStationNameButtonProps extends TouchableScaleProps {
  disabled: boolean
  onPress: () => void
  name: string
}

export function RouteStationNameButton(props: RouteStationNameButtonProps) {
  const { disabled, onPress, name, style, ...rest } = props

  return (
    <AnimatedTouchable friction={9} activeScale={0.95} disabled={disabled} onPress={onPress} style={style} {...rest}>
      <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
        {name}
      </Text>
    </AnimatedTouchable>
  )
}
