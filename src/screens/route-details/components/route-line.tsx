import { ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import Animated from "react-native-reanimated"
import { RouteElementStateType, useRouteColors } from "./use-route-colors"
import { useAnimatedBackground } from "@/hooks/animations/use-animated-color-props"

interface RouteLineProps {
  state?: RouteElementStateType
  style?: ViewStyle
}

export const RouteLine = ({ state = "idle", style }: RouteLineProps) => {
  const bgColor = useRouteColors(state, "line")
  const backgroundStyle = useAnimatedBackground(bgColor)

  return <Animated.View style={[styles.routeStopLine, backgroundStyle, style]} />
}

const styles = StyleSheet.create((theme, rt) => ({
  routeStopLine: {
    width: 4,
    height: 18 * rt.fontScale,
    zIndex: 0,
  },
}))
