import { useEffect, useState } from "react"
import { useSharedValue, withTiming } from "react-native-reanimated"

/**
 * Helper hook to toggle between two colors, used for color interpolation.
 */
export function useColorToggler(color: string) {
  const [firstColor, setFirstColor] = useState(color)
  const [secondColor, setSecondColor] = useState(color)
  const progress = useSharedValue(0)

  useEffect(() => {
    // initial - set both stops to the initial color
    if (firstColor === "#000" && secondColor === "#000") {
      setFirstColor(color)
      setSecondColor(color)
    } else {
      if (progress.value === 1) {
        setFirstColor(color)
        progress.value = withTiming(0)
      } else {
        setSecondColor(color)
        progress.value = withTiming(1)
      }
    }
  }, [color])

  return { progress, firstColor, secondColor }
}
