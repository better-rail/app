import React from "react"
import { View } from "react-native"
import { MenuView } from "@expo/ui/community/menu"
import type { MenuAction } from "@expo/ui/community/menu"
import { FillWidth } from "./fill-width"
import type { ContextMenuProps } from "./types"

export type { ContextMenuAction, ContextMenuProps } from "./types"

// Non-iOS: tap menus render a Material dropdown, long press is left to the caller.
export function ContextMenu(props: ContextMenuProps) {
  const { children, actions, mode = "longPress", style, fillWidth = false, disabled = false } = props

  if (disabled || mode !== "tap" || actions.length === 0) {
    return style ? <View style={style}>{children}</View> : <>{children}</>
  }

  if (fillWidth) {
    return (
      <FillWidth style={style}>
        {(width) => (
          <NativeMenu {...props} style={undefined}>
            <View style={{ width }}>{children}</View>
          </NativeMenu>
        )}
      </FillWidth>
    )
  }

  return <NativeMenu {...props} />
}

function NativeMenu({ children, actions, style, onPressAction }: ContextMenuProps) {
  const menuActions: MenuAction[] = actions.map((action, index) => ({
    id: String(index),
    title: action.title,
    state: action.selected ? "on" : undefined,
    attributes: action.destructive ? { destructive: true } : undefined,
  }))

  return (
    <MenuView
      actions={menuActions}
      style={style}
      onPressAction={({ nativeEvent }) => {
        onPressAction?.()
        actions[Number(nativeEvent.event)]?.onPress()
      }}
    >
      {children}
    </MenuView>
  )
}
