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
  borderColor: Platform.select({ ios: color.separator, android: "#bdbdc2" }),
  zIndex: 10,
}

export const RouteStationCircle = ({ state }: { state: string }) => {
  if (state === "inProgress") return <InProgressRouteStationCircle />
  return <View style={[ROUTE_STOP_CIRCLE, { backgroundColor: ROUTE_LINE_STATE_COLORS[state] }]} />
}

const InProgressRouteStationCircle = () => {
  const animatedStyle = useRideProgressAnimation()
  return <Animated.View style={[ROUTE_STOP_CIRCLE, animatedStyle]} />
}
