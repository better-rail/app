import { Platform, View, ViewStyle } from "react-native"
import Animated from "react-native-reanimated"
import { color } from "../../../theme"
import { ROUTE_LINE_STATE_COLORS } from "./route-line"
import { useRideProgressAnimation } from "../../../hooks/use-ride-progress"

const ROUTE_STOP_CIRCLE: ViewStyle = {
  width: 30,
  height: 30,
  borderRadius: 25,
  borderWidth: 3.5,
  zIndex: 10,
}

const ROUTE_STOP_CIRCLE_COLORS = {
  passed: color.circleGreenFill,
  idle: color.background,
  inProgress: "#F5AF00",
}

export const RouteStationCircle = ({ state }: { state: string }) => {
  if (state === "inProgress") return <InProgressRouteStationCircle />
  return (
    <View
      style={[
        ROUTE_STOP_CIRCLE,
        { backgroundColor: ROUTE_STOP_CIRCLE_COLORS[state], borderColor: ROUTE_LINE_STATE_COLORS[state] },
      ]}
    />
  )
}

const InProgressRouteStationCircle = () => {
  const animatedStyle = useRideProgressAnimation()
  return <Animated.View style={[ROUTE_STOP_CIRCLE, animatedStyle, { borderColor: ROUTE_LINE_STATE_COLORS["inProgress"] }]} />
}
