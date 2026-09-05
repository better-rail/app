import React from "react"
import { View } from "react-native"
import { MenuView } from "@expo/ui/community/menu"
import type { MenuAction } from "@expo/ui/community/menu"
import { Button, ContextMenu as SwiftUIContextMenu, Group, Host, RNHostView, Section } from "@expo/ui/swift-ui"
import type { ButtonProps } from "@expo/ui/swift-ui"
import { contentShape, shapes } from "@expo/ui/swift-ui/modifiers"
import type { ContextMenuProps } from "./types"

export type { ContextMenuAction, ContextMenuProps } from "./types"

export function ContextMenu(props: ContextMenuProps) {
  const { children, actions, mode = "longPress", title, previewBorderRadius, style, disabled = false, onPressAction } = props

  if (disabled || actions.length === 0) {
    return style ? <View style={style}>{children}</View> : <>{children}</>
  }

  if (mode === "tap") {
    const menuActions: MenuAction[] = actions.map((action, index) => ({
      id: String(index),
      title: action.title,
      image: action.systemIcon as MenuAction["image"],
      attributes: action.destructive ? { destructive: true } : undefined,
    }))

    return (
      <MenuView
        title={title}
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

  // Composed from SwiftUI primitives so the trigger can round the preview shape.
  const items = actions.map((action, index) => (
    <Button
      key={index}
      label={action.title}
      systemImage={action.systemIcon as ButtonProps["systemImage"]}
      role={action.destructive ? "destructive" : undefined}
      onPress={() => {
        onPressAction?.()
        action.onPress()
      }}
    />
  ))

  const triggerModifiers =
    previewBorderRadius !== undefined
      ? [contentShape(shapes.roundedRectangle({ cornerRadius: previewBorderRadius }), "contextMenuPreview")]
      : undefined

  return (
    <Host matchContents style={style} ignoreSafeArea="all">
      <SwiftUIContextMenu>
        <SwiftUIContextMenu.Trigger>
          <Group modifiers={triggerModifiers}>
            <RNHostView matchContents>
              <>{children}</>
            </RNHostView>
          </Group>
        </SwiftUIContextMenu.Trigger>
        <SwiftUIContextMenu.Items>{title ? <Section title={title}>{items}</Section> : items}</SwiftUIContextMenu.Items>
      </SwiftUIContextMenu>
    </Host>
  )
}
