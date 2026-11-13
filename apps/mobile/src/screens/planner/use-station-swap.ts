import { useRef, useState } from "react"
import { Animated } from "react-native"
import type { LayoutChangeEvent } from "react-native"
import { useReducedMotion } from "react-native-reanimated"

type Card = "upper" | "lower"

// Samples of a sine arc, so the mid-glide scale eases in and out instead of turning on a point.
const SCALE_STEPS = Array.from({ length: 13 }, (_, i) => i / 12)

/**
 * The planner's two station cards trading places. Each card keeps its station and moves by transform,
 * so nothing re-renders mid-glide; `type` says which station a card holds after a swap.
 */
export function useStationSwap() {
  // 0 = the upper card holds the origin, 1 = the cards have traded places.
  const progress = useRef(new Animated.Value(0)).current
  const [flipped, setFlipped] = useState(false)
  const offsets = useRef({ upper: 0, lower: 0 })
  const [distance, setDistance] = useState(0)
  const reduceMotion = useReducedMotion()

  const swap = () => {
    const toValue = flipped ? 0 : 1
    setFlipped(!flipped)

    if (reduceMotion) {
      progress.setValue(toValue)
    } else {
      // A spring lands softly and keeps its speed when a second tap reverses it mid-glide.
      Animated.spring(progress, { toValue, stiffness: 210, damping: 26, mass: 1, useNativeDriver: true }).start()
    }
  }

  const card = (name: Card, direction: 1 | -1, midScale: number) => ({
    type: (name === "upper") !== flipped ? ("origin" as const) : ("destination" as const),
    onLayout: (e: LayoutChangeEvent) => {
      offsets.current[name] = e.nativeEvent.layout.y
      setDistance(offsets.current.lower - offsets.current.upper)
    },
    style: {
      transform: [
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, direction * distance] }) },
        {
          scale: progress.interpolate({
            inputRange: SCALE_STEPS,
            outputRange: SCALE_STEPS.map((p) => 1 + (midScale - 1) * Math.sin(Math.PI * p)),
            extrapolate: "clamp",
          }),
        },
      ],
    },
  })

  return { swap, upper: card("upper", 1, 0.94), lower: card("lower", -1, 1.02) }
}
