import type { StyleProp, TextStyle } from "react-native"

export type NumericTextProps = {
  /** The formatted number shown */
  children: string
  /** The raw number, so the digits know when and which way to roll */
  value: number | undefined
  /** Only fontSize, fontWeight, color and a "ui-rounded" fontFamily carry over to SwiftUI */
  style?: StyleProp<TextStyle>
  /** Span the parent's width, so a shrinking number rolls out inside it instead of overflowing */
  fillWidth?: boolean
  /** Trailing unit laid out with the number, so it follows the rolling digits without a layout jump */
  unit?: string | null
  unitStyle?: StyleProp<TextStyle>
}
