import { useEffect } from "react"
import { interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated"

/**
 * Creates an animated "flashing" background style.
 * @returns Animated style which interpolates the background color back and forth.
 */
export function useRideProgressAnimation() {
  const progress = useSharedValue(0)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(progress.value, [0, 1], ["#FFC533", "#fd9e02"]),
    }
  })

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true)
  }, [])

  return animatedStyle
}
