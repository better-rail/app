import { View, ViewStyle } from "react-native"
import { color, fontScale } from "../../../theme"
import Animated from "react-native-reanimated"
import { useRideProgressAnimation } from "../../../hooks/use-ride-progress"

export type RouteLineStateType = "idle" | "inProgress" | "passed"

const ROUTE_STOP_LINE: ViewStyle = {
  width: 4,
  height: 10 * fontScale,
  backgroundColor: color.separator,
  zIndex: 0,
}

export const ROUTE_LINE_STATE_COLORS = {
  idle: color.separator,
  inProgress: color.circleOrangeBorder,
  passed: color.circleGreenBorder,
}

interface RouteLineProps {
  state?: RouteLineStateType
  style?: ViewStyle
}

export const RouteLine = ({ state = "idle", style }: RouteLineProps) => {
  if (state === "inProgress") {
    return <InProgressLine />
  }

  return <View style={[ROUTE_STOP_LINE, { backgroundColor: ROUTE_LINE_STATE_COLORS[state] }, style]} />
}

const InProgressLine = ({ style }: { style?: any }) => {
  const animatedStyle = useRideProgressAnimation()
  return <Animated.View style={[ROUTE_STOP_LINE, animatedStyle, style]} />
}
