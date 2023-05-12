import { interpolateColor, useAnimatedStyle } from "react-native-reanimated"
import { useColorToggler } from "./use-color-toggler"

export function useAnimatedBorder(color: string) {
  const { progress, firstColor, secondColor } = useColorToggler(color)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(progress.value, [0, 1], [firstColor, secondColor]),
    }
  })

  return animatedStyle
}

export function useAnimatedBackground(color: string) {
  const { progress, firstColor, secondColor } = useColorToggler(color)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(progress.value, [0, 1], [firstColor, secondColor]),
    }
  })

  return animatedStyle
}
