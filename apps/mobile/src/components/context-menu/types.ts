import type { StyleProp, ViewStyle } from "react-native"

export interface ContextMenuAction {
  title: string
  /** SF Symbol name. iOS only — for a selection tick use `selected`. */
  systemIcon?: string
  /** Renders a checkmark next to the action, on both platforms. */
  selected?: boolean
  destructive?: boolean
  onPress: () => void
}

export interface ContextMenuProps {
  children: React.ReactNode
  actions: ContextMenuAction[]
  /** @default "longPress" */
  mode?: "longPress" | "tap"
  title?: string
  /** Corner radius of the long-press preview */
  previewBorderRadius?: number
  style?: StyleProp<ViewStyle>
  disabled?: boolean
  /** Runs before the selected action's `onPress` */
  onPressAction?: () => void
}
