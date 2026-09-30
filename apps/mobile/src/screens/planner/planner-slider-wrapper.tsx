import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { isRTL } from "@/i18n"
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { trackEvent } from "@/services/analytics"

interface FlingGestureWrapperProps {
  children: React.ReactNode
  onFling: () => void
}

/**
 * A wrapper that allows the user to fling the screen to trigger an action
 */
export function FlingGestureWrapper(props: FlingGestureWrapperProps) {
  const { children, onFling } = props
  const slideOffset = useSharedValue(0)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slideOffset.value }],
    }
  })

  const gesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onEnd((e) => {
      const direction = isRTL ? -1 : 1

      // Only trigger if the velocity is high enough and in the correct direction
      if (Math.abs(e.velocityX) > 800 && Math.sign(e.velocityX) === direction) {
        slideOffset.value = withSequence(
          withTiming(direction * 12, { duration: 100 }),
          withSpring(0, { damping: 10, stiffness: 100 }),
        )
        runOnJS(onFling)()
        runOnJS(trackEvent)("switch_stations_fling")
      }
    })

  return (
    <GestureDetector gesture={gesture}>
      <Animated.ScrollView style={[{ flex: 1 }, animatedStyle]} contentContainerStyle={{ flexGrow: 1 }}>
        {children}
      </Animated.ScrollView>
    </GestureDetector>
  )
}
