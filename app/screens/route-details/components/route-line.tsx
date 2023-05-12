import { ViewStyle } from "react-native"
import Animated from "react-native-reanimated"
import { color, fontScale } from "../../../theme"
import { RouteElementStateType, useRouteColors } from "./use-route-colors"
import { useAnimatedBackground } from "../../../hooks/animations/use-animated-color-props"

const ROUTE_STOP_LINE: ViewStyle = {
  width: 4,
  height: 18 * fontScale,
  zIndex: 0,
}

interface RouteLineProps {
  state?: RouteElementStateType
  style?: ViewStyle
}

export const RouteLine = ({ state = "idle", style }: RouteLineProps) => {
  const bgColor = useRouteColors(state, "line")
  const backgroundStyle = useAnimatedBackground(bgColor)

  return <Animated.View style={[ROUTE_STOP_LINE, backgroundStyle, style]} />
}
