import React from "react"
import { View } from "react-native"
import type { ContextMenuProps } from "./types"

export type { ContextMenuAction, ContextMenuProps } from "./types"

// Non-iOS fallback. Callers handle long press themselves.
export function ContextMenu(props: ContextMenuProps) {
  const { children, style } = props
  return style ? <View style={style}>{children}</View> : <>{children}</>
}
