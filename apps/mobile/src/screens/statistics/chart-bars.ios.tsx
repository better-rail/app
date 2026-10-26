import { useState } from "react"
import { Host, HStack, Rectangle, RoundedRectangle, ZStack } from "@expo/ui/swift-ui"
import { animation, Animation, foregroundStyle, frame, offset, onAppear, opacity } from "@expo/ui/swift-ui/modifiers"
import { statsPalette } from "./statistics-palette"
import {
  BAR_RADIUS,
  CHART_HEIGHT,
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

// The palette's track as hex, since SwiftUI colors don't take rgba()
const TRACK_COLOR = "#FFFFFF1F"
// Critically damped, so bars settle without overshooting
const GROW = Animation.spring({ response: 0.45, dampingFraction: 1 })
const DIM = Animation.easeOut({ duration: 0.15 })

/** Bars drawn in SwiftUI, so they animate natively */
export function ChartBars(props: ChartBarsProps) {
  if (props.width === 0) return null
  return <Bars key={props.layoutKey} {...props} />
}

function Bars({ buckets, max, width, selected, averageHeight }: ChartBarsProps) {
  // Mount flat and grow once SwiftUI has drawn that, so a new period rises from the baseline
  const [shown, setShown] = useState(false)

  const gap = barGap(buckets.length)
  const slot = (width - gap * (buckets.length - 1)) / buckets.length
  const barWidth = Math.min(MAX_BAR_WIDTH, slot)
  const lineY = shown && averageHeight !== undefined ? averageHeight : 0

  return (
    // Otherwise SwiftUI pushes the bars down as they scroll under the transparent header
    <Host style={{ width, height: CHART_HEIGHT }} ignoreSafeArea="all">
      <ZStack
        alignment="bottom"
        modifiers={[frame({ width, height: CHART_HEIGHT, alignment: "bottom" }), onAppear(() => setShown(true))]}
      >
        <HStack spacing={gap} alignment="bottom">
          {buckets.map((bucket, index) => {
            const height = shown ? barHeight(bucket, max) : MIN_BAR_HEIGHT
            return (
              <RoundedRectangle
                key={index}
                cornerRadius={BAR_RADIUS}
                modifiers={[
                  foregroundStyle(isEmptyBar(bucket) ? TRACK_COLOR : statsPalette.accent),
                  opacity(shown ? barOpacity(bucket, index, selected) : 0),
                  frame({ width: barWidth, height }),
                  frame({ width: slot, height: CHART_HEIGHT, alignment: "bottom" }),
                  animation(GROW, height),
                  animation(GROW, shown),
                  animation(DIM, selected ?? -1),
                ]}
              />
            )
          })}
        </HStack>
        <HStack
          spacing={DASH_WIDTH}
          modifiers={[
            frame({ width, height: LINE_WIDTH, alignment: "leading" }),
            offset({ y: LINE_WIDTH / 2 - lineY }),
            opacity(shown && averageHeight !== undefined ? 1 : 0),
            animation(GROW, lineY),
          ]}
        >
          {Array.from({ length: Math.ceil(width / (DASH_WIDTH * 2)) }, (_, index) => (
            <Rectangle
              key={index}
              modifiers={[foregroundStyle(statsPalette.orange), frame({ width: DASH_WIDTH, height: LINE_WIDTH })]}
            />
          ))}
        </HStack>
      </ZStack>
    </Host>
  )
}
