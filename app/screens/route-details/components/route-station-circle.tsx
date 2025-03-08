import { ViewStyle } from "react-native"
import Animated from "react-native-reanimated"
import { useAnimatedBackground, useAnimatedBorder } from "../../../hooks/animations/use-animated-color-props"
import { RouteElementStateType, useRouteColors } from "./use-route-colors"

const ROUTE_STOP_CIRCLE: ViewStyle = {
  width: 30,
  height: 30,
  borderRadius: 25,
  borderWidth: 3.5,
  zIndex: 10,
}

export const RouteStationCircle = ({ state }: { state: RouteElementStateType }) => {
  const bgColor = useRouteColors(state, "circle")
  const borderColor = useRouteColors(state, "line")

  const backgroundStyle = useAnimatedBackground(bgColor)
  const borderStyle = useAnimatedBorder(borderColor)

  return <Animated.View style={[ROUTE_STOP_CIRCLE, backgroundStyle, borderStyle]} />
}
