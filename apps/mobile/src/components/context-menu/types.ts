import type { StyleProp, ViewStyle } from "react-native"

export interface ContextMenuAction {
  title: string
  /** SF Symbol name. iOS only — for a selection tick use `selected`. */
  systemIcon?: string
  /** Renders a checkmark next to the action, on both platforms. */
  selected?: boolean
  destructive?: boolean
  disabled?: boolean
  onPress: () => void
}

export interface ContextMenuRef {
  /** Opens a long-press menu. Android only: iOS opens it natively, and its menu sets no ref. */
  show: () => void
}

export interface ContextMenuProps {
  /** Android renders a long-press menu only with a ref; the content opens it by calling `show()` from its onLongPress */
  ref?: React.Ref<ContextMenuRef>
  children: React.ReactNode
  actions: ContextMenuAction[]
  /** @default "longPress" */
  mode?: "longPress" | "tap"
  title?: string
  /** Corner radius of the long-press preview */
  previewBorderRadius?: number
  style?: StyleProp<ViewStyle>
  /** Stretches the content to the available width; native menu hosts otherwise size it to its content */
  fillWidth?: boolean
  disabled?: boolean
  /** Runs before the selected action's `onPress` */
  onPressAction?: () => void
}
