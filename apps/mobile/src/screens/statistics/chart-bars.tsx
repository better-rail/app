import { useEffect, useState } from "react"
import { View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated"
import type { ChartBucket } from "./compute-stats"
import { statsPalette } from "./statistics-palette"
import {
  BAR_RADIUS,
  DASH_WIDTH,
  LINE_WIDTH,
  MAX_BAR_WIDTH,
  MIN_BAR_HEIGHT,
  barGap,
  barHeight,
  barOpacity,
  isEmptyBar,
  type ChartBarsProps,
} from "./chart-bars.types"

const GROW = { duration: 400, easing: Easing.out(Easing.cubic) }
const DIM = { duration: 150 }

// Non-iOS: bars grow with Reanimated
export function ChartBars(props: ChartBarsProps) {
  return <Bars key={props.layoutKey} {...props} />
}

function Bars({ buckets, max, width, selected, averageHeight }: ChartBarsProps) {
  // Mount flat, then grow, so a new period rises from the baseline
  const [shown, setShown] = useState(false)
  useEffect(() => {
    // A frame later, or the flat state never reaches the screen and nothing animates
    const request = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(request)
  }, [])
  const lineY = shown && averageHeight !== undefined ? averageHeight : 0
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(-lineY, GROW) }],
    opacity: withTiming(shown && averageHeight !== undefined ? 1 : 0, GROW),
  }))

  return (
    <View style={styles.plot}>
      <View style={[styles.bars, { gap: barGap(buckets.length) }]}>
        {buckets.map((bucket, index) => (
          <Bar
            key={index}
            bucket={bucket}
            height={shown ? barHeight(bucket, max) : MIN_BAR_HEIGHT}
            opacity={shown ? barOpacity(bucket, index, selected) : 0}
          />
        ))}
      </View>
      <Animated.View style={[styles.line, lineStyle]} pointerEvents="none">
        {Array.from({ length: Math.ceil(width / (DASH_WIDTH * 2)) }, (_, index) => (
          <View key={index} style={styles.dash} />
        ))}
      </Animated.View>
    </View>
  )
}

function Bar({ bucket, height, opacity }: { bucket: ChartBucket; height: number; opacity: number }) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: withTiming(height, GROW),
    opacity: withTiming(opacity, DIM),
  }))

  return (
    <View style={styles.barCell}>
      <Animated.View style={[styles.bar, animatedStyle, isEmptyBar(bucket) && styles.barEmpty]} />
    </View>
  )
}

const styles = StyleSheet.create({
  plot: {
    flex: 1,
  },
  bars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  barCell: {
    flex: 1,
    alignItems: "center",
  },
  bar: {
    width: "100%",
    maxWidth: MAX_BAR_WIDTH,
    height: MIN_BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    borderCurve: "continuous",
    backgroundColor: statsPalette.accent,
  },
  barEmpty: {
    backgroundColor: statsPalette.track,
  },
  line: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: -LINE_WIDTH / 2,
    height: LINE_WIDTH,
    flexDirection: "row",
    gap: DASH_WIDTH,
    overflow: "hidden",
  },
  dash: {
    width: DASH_WIDTH,
    height: LINE_WIDTH,
    backgroundColor: statsPalette.orange,
  },
})
