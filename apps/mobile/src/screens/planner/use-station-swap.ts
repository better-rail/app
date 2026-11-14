import { useRef, useState } from "react"
import type { LayoutChangeEvent, ViewStyle } from "react-native"
import { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"

type Card = "upper" | "lower"

/** Where a card sits `p` of the way through the glide; the scale follows a sine arc, so it eases in and out. */
function glide(p: number, distance: number, direction: 1 | -1, midScale: number): ViewStyle {
  "worklet"
  const arc = Math.sin(Math.PI * Math.min(Math.max(p, 0), 1))
  return { transform: [{ translateY: p * direction * distance }, { scale: 1 + (midScale - 1) * arc }] }
}

/**
 * The planner's two station cards trading places. Each card keeps its station and moves by transform;
 * the glide runs on the UI thread, so the re-render and route prefetch that follow a swap can't stall it.
 * `type` says which station a card holds after a swap.
 */
export function useStationSwap() {
  // 0 = the upper card holds the origin, 1 = the cards have traded places.
  const progress = useSharedValue(0)
  const distance = useSharedValue(0)
  // A plain ref: the two cards report their layout back to back, and a shared value read from JS
  // can still hold the value from before the first write, which would measure the wrong gap.
  const offsets = useRef({ upper: 0, lower: 0 })
  const [flipped, setFlipped] = useState(false)

  const upperStyle = useAnimatedStyle(() => glide(progress.value, distance.value, 1, 0.94))
  const lowerStyle = useAnimatedStyle(() => glide(progress.value, distance.value, -1, 1.02))

  const swap = () => {
    setFlipped(!flipped)
    // A spring lands softly and keeps its speed when a second tap reverses it mid-glide.
    progress.set(withSpring(flipped ? 0 : 1, { stiffness: 210, damping: 26, mass: 1, reduceMotion: ReduceMotion.System }))
  }

  const card = (name: Card, style: typeof upperStyle) => ({
    type: (name === "upper") !== flipped ? ("origin" as const) : ("destination" as const),
    onLayout: (e: LayoutChangeEvent) => {
      offsets.current[name] = e.nativeEvent.layout.y
      distance.set(offsets.current.lower - offsets.current.upper)
    },
    style,
  })

  return { swap, upper: card("upper", upperStyle), lower: card("lower", lowerStyle) }
}
