import { useEffect, useMemo } from "react"
import { useColorScheme } from "react-native"
import { interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated"

/**
 * Creates an animated "flashing" background style.
 * @returns Animated style which interpolates the background color back and forth.
 */
export function useRideProgressAnimation() {
  const scheme = useColorScheme()
  const colors = useMemo(() => {
    if (scheme === "light") {
      return { base: "#FDB035", target: "#FED89A" }
    }

    return { base: "#A36500", target: "#B87100" }
  }, [scheme])

  const progress = useSharedValue(0)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(progress.value, [0, 1], [colors.base, colors.target]),
    }
  })

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true)
  }, [])

  return animatedStyle
}
