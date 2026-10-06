import { Host, Text } from "@expo/ui/swift-ui"
import { animation, Animation, contentTransition, dynamicTypeSize, font, monospacedDigit } from "@expo/ui/swift-ui/modifiers"
import { primaryFont } from "@/theme/typography"
import { formatHourBubble } from "./hour-format"
import type { HourBubbleTextProps } from "./hour-bubble-text.types"

/** The bubble's hour label, rolling digits with SwiftUI's numeric text transition. */
export function HourBubbleText({ hour, countsDown }: HourBubbleTextProps) {
  if (hour === null) return null

  return (
    <Host matchContents>
      <Text
        modifiers={[
          font({ family: primaryFont, size: 20, weight: "bold" }),
          monospacedDigit(),
          // Capped so the hour still fits the fixed-size bubble at large text sizes
          dynamicTypeSize({ max: "xxxLarge" }),
          contentTransition("numericText", { countsDown }),
          animation(Animation.spring({ response: 0.3, dampingFraction: 0.85 }), hour),
        ]}
      >
        {formatHourBubble(hour)}
      </Text>
    </Host>
  )
}
