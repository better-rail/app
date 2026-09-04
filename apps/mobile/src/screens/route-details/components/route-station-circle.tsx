import { StyleSheet } from "react-native-unistyles"
import Animated from "react-native-reanimated"
import { useAnimatedBackground, useAnimatedBorder } from "@/hooks/animations/use-animated-color-props"
import { RouteElementStateType, useRouteColors } from "./use-route-colors"

export const RouteStationCircle = ({ state }: { state: RouteElementStateType }) => {
  const bgColor = useRouteColors(state, "circle")
  const borderColor = useRouteColors(state, "line")

  const backgroundStyle = useAnimatedBackground(bgColor)
  const borderStyle = useAnimatedBorder(borderColor)

  return <Animated.View style={[styles.routeStopCircle, backgroundStyle, borderStyle]} />
}

const styles = StyleSheet.create({
  routeStopCircle: {
    width: 30,
    height: 30,
    borderRadius: 25,
    borderWidth: 3.5,
    zIndex: 10,
  },
})
