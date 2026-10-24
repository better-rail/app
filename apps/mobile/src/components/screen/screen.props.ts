import { ViewStyle } from "react-native"
import { KeyboardOffsets, ScreenPresets } from "./screen.presets"

export interface ScreenProps {
  /**
   * Children components.
   */
  children?: React.ReactNode

  /** Stable accessibility identifier used by end-to-end tests. */
  testID?: string

  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle

  /**
   * One of the different types of presets.
   */
  preset?: ScreenPresets

  /**
   * An optional background color
   */
  backgroundColor?: string

  /**
   * An optional status bar setting. Defaults to light-content.
   */
  statusBar?: "light-content" | "dark-content"

  /**
   * Whether the status bar should be translucent
   */
  translucent?: boolean

  /**
   * An optional status bar setting. Defaults to light-content.
   */
  statusBarBackgroundColor?: string

  /**
   * Should we not wrap in SafeAreaView? Defaults to false.
   */
  unsafe?: boolean

  /**
   * Pads the top by the native stack header's height, for a screen whose content starts below the header: on iOS 26+
   * the header is transparent and the screen is laid out under it, with no inset of its own. Defaults to false.
   */
  belowHeader?: boolean

  /**
   * Skip the left and right safe-area insets, so full-width backgrounds reach the screen edges.
   * The screen must then inset its own foreground content — iPhone Duo puts the status bar,
   * camera and navigation bar on a side edge, so the two insets are often different.
   */
  edgeToEdge?: boolean

  /**
   * By how much should we offset the keyboard? Defaults to none.
   */
  keyboardOffset?: KeyboardOffsets
}
