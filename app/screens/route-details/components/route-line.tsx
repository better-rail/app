import { View, ViewStyle } from "react-native"
import { color, fontScale } from "../../../theme"
import Animated from "react-native-reanimated"
import { useRideProgressAnimation } from "../../../hooks/use-ride-progress"

const ROUTE_STOP_LINE: ViewStyle = {
  width: 4,
  height: 22.5 * fontScale,
  backgroundColor: color.separator,
  zIndex: 0,
}

export const ROUTE_LINE_STATE_COLORS = {
  // idle: color.separator.toString(),
  // inProgress: "#9BE379",
  // passed: "#6EAB5C",
  idle: color.separator,
  inProgress: "orange",
  passed: color.greenText,
}

export const RouteLine = ({ state = "idle", style }: { state: "idle" | "inProgress" | "passed" }) => {
  if (state === "inProgress") {
    return <InProgressLine />
  }

  return <View style={[ROUTE_STOP_LINE, { backgroundColor: ROUTE_LINE_STATE_COLORS[state] }]} />
}

const InProgressLine = () => {
  const animatedStyle = useRideProgressAnimation()
  return <Animated.View style={[ROUTE_STOP_LINE, animatedStyle]} />
}
