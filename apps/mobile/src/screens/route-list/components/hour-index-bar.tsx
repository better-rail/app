import { useEffect, useRef, useState } from "react"
import { View, Text, StyleSheet as RNStyleSheet, type LayoutChangeEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import HapticFeedback from "react-native-haptic-feedback"
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"
import { StyleSheet } from "react-native-unistyles"
import { isRTL, translate, use12HourClock } from "@/i18n"
import { formatHourLabel, formatHourTime } from "./hour-format"
import { HourBubbleText } from "./hour-bubble-text"

export type HourIndexEntry = { hour: number; index: number }

type HourIndexBarProps = {
  entries: HourIndexEntry[]
  /** Departure hour of the route at the top of the list */
  topHour: SharedValue<number>
  onSelect: (entry: HourIndexEntry) => void
}

const BUBBLE_HEIGHT = 56
// Wider for "12:00 PM". A function, since the clock format is resolved after this module loads
const bubbleWidth = () => (use12HourClock ? 116 : 86)
// Far enough from the bar that the scrubbing thumb doesn't cover it
const BUBBLE_GAP = 56
// The bubble grows out of the bar, so it starts shifted toward it
const ENTER_OFFSET = (isRTL ? -1 : 1) * 40
const SPRING = { damping: 18, stiffness: 260, mass: 0.8 }
// Let the bubble finish growing before the list jump, which can stall a frame or two
const FIRST_JUMP_DELAY = 120

/** A contacts-style side index that jumps the route list to the first train of each hour. */
export function HourIndexBar({ entries, topHour, onSelect }: HourIndexBarProps) {
  const barHeight = useSharedValue(0)
  const barTop = useSharedValue(0)
  const activeIndex = useSharedValue(-1)
  const bubbleY = useSharedValue(0)
  const visible = useSharedValue(0)
  const count = entries.length
  const hours = entries.map((entry) => entry.hour)

  // Scrubbing can outpace list rendering, so jumps are coalesced to the latest hour per frame
  const pendingHour = useRef<number | null>(null)
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jumpFrame = useRef<number | null>(null)
  const [bubble, setBubble] = useState<{ hour: number | null; countsDown: boolean }>({ hour: null, countsDown: false })

  // A deferred jump resolves against the latest entries, since the list data can change before it fires
  const latest = useRef({ entries, onSelect })
  useEffect(() => {
    latest.current = { entries, onSelect }
  })

  useEffect(
    () => () => {
      if (jumpTimer.current) clearTimeout(jumpTimer.current)
      if (jumpFrame.current !== null) cancelAnimationFrame(jumpFrame.current)
    },
    [],
  )

  const flushJump = () => {
    jumpTimer.current = null
    jumpFrame.current = null
    const entry = latest.current.entries.find((e) => e.hour === pendingHour.current)
    pendingHour.current = null
    if (entry) latest.current.onSelect(entry)
  }

  // Mirrors the scroll-linked hour for accessibility, updating only when the hour changes
  const [currentHour, setCurrentHour] = useState(-1)
  useAnimatedReaction(
    () => topHour.value,
    (hour, previous) => {
      if (hour !== previous) scheduleOnRN(setCurrentHour, hour)
    },
  )

  const select = (i: number, isFirstTouch: boolean) => {
    const entry = entries[i]
    if (!entry) return
    HapticFeedback.trigger("selection")
    setBubble((prev) => ({ hour: entry.hour, countsDown: prev.hour !== null && entry.hour < prev.hour }))
    pendingHour.current = entry.hour
    if (isFirstTouch) {
      if (jumpTimer.current) clearTimeout(jumpTimer.current)
      jumpTimer.current = setTimeout(flushJump, FIRST_JUMP_DELAY)
    } else if (!jumpTimer.current && jumpFrame.current === null) {
      jumpFrame.current = requestAnimationFrame(flushJump)
    }
  }

  const trackTouch = (y: number, isFirstTouch: boolean) => {
    "worklet"
    if (barHeight.value === 0 || count === 0) return
    const rowHeight = barHeight.value / count
    const i = Math.min(count - 1, Math.max(0, Math.floor(y / rowHeight)))
    if (i === activeIndex.value) return
    activeIndex.value = i

    const targetY = barTop.value + i * rowHeight + rowHeight / 2 - BUBBLE_HEIGHT / 2
    if (isFirstTouch) {
      bubbleY.value = targetY
      visible.value = withSpring(1, SPRING)
    } else {
      bubbleY.value = withSpring(targetY, SPRING)
    }
    scheduleOnRN(select, i, isFirstTouch)
  }

  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => trackTouch(e.y, true))
    .onUpdate((e) => trackTouch(e.y, false))
    .onFinalize(() => {
      activeIndex.value = -1
      visible.value = withTiming(0, { duration: 180 })
    })

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [
      { translateY: bubbleY.value },
      { translateX: (1 - visible.value) * ENTER_OFFSET },
      { scale: 0.5 + visible.value * 0.5 },
    ],
  }))

  // Doubles as a scroll indicator: a pill behind the hour at the top of the list, or under the finger while scrubbing
  const indicatorStyle = useAnimatedStyle(() => {
    const index = activeIndex.value >= 0 ? activeIndex.value : hours.indexOf(topHour.value)
    const rowHeight = count > 0 ? barHeight.value / count : 0
    return {
      height: rowHeight,
      opacity: withTiming(index >= 0 ? 1 : 0, { duration: 150 }),
      transform: [{ translateY: withSpring(Math.max(index, 0) * rowHeight, SPRING) }],
    }
  })

  const onLayout = (e: LayoutChangeEvent) => {
    barHeight.value = e.nativeEvent.layout.height
    barTop.value = e.nativeEvent.layout.y
  }

  // VoiceOver / TalkBack swipes step from the hour currently at the top of the list
  const step = (direction: 1 | -1) => {
    const i = Math.min(count - 1, Math.max(0, hours.indexOf(currentHour) + direction))
    const entry = entries[i]
    if (!entry) return
    setCurrentHour(entry.hour)
    onSelect(entry)
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <GestureDetector gesture={gesture}>
        <View
          style={styles.bar}
          onLayout={onLayout}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={translate("routes.hourIndex") ?? undefined}
          accessibilityValue={{ text: currentHour >= 0 ? formatHourTime(currentHour) : undefined }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
        >
          <Animated.View style={[plainStyles.indicator, indicatorStyle]} pointerEvents="none">
            <View style={styles.indicatorFill} />
          </Animated.View>
          {entries.map((entry, i) => (
            <HourLabel key={entry.hour} hour={entry.hour} index={i} activeIndex={activeIndex} />
          ))}
        </View>
      </GestureDetector>

      {/* Animated props stay on plain RN styles; Unistyles styles live on the inner views */}
      {/* Hidden from screen readers, which get the hour from the bar's value */}
      <Animated.View
        style={[plainStyles.bubble, { width: bubbleWidth() }, bubbleStyle]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.bubble}>
          <HourBubbleText hour={bubble.hour} countsDown={bubble.countsDown} />
        </View>
      </Animated.View>
    </View>
  )
}

function HourLabel(props: { hour: number; index: number; activeIndex: SharedValue<number> }) {
  const { hour, index, activeIndex } = props
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(activeIndex.value === index ? 1.3 : 1, { duration: 120 }) }],
  }))

  return (
    <Animated.View style={animatedStyle}>
      <Text style={styles.label}>{formatHourLabel(hour)}</Text>
    </Animated.View>
  )
}

const plainStyles = RNStyleSheet.create({
  indicator: {
    position: "absolute",
    top: 0,
    start: 0,
    end: 0,
    opacity: 0,
  },
  bubble: {
    position: "absolute",
    top: 0,
    end: BUBBLE_GAP,
    height: BUBBLE_HEIGHT,
    opacity: 0,
  },
})

const styles = StyleSheet.create((theme) => ({
  container: {
    position: "absolute",
    top: 0,
    bottom: 0,
    end: 0,
    justifyContent: "center",
  },
  bar: {
    paddingHorizontal: theme.spacing[1],
    alignItems: "center",
  },
  indicatorFill: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    opacity: 0.18,
  },
  label: {
    fontFamily: theme.typography.primary,
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    lineHeight: 17,
    color: theme.colors.primary,
  },
  bubble: {
    flex: 1,
    borderRadius: BUBBLE_HEIGHT / 2,
    backgroundColor: theme.colors.secondaryBackground,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15)",
  },
}))
