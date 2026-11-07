import React, { useEffect, useImperativeHandle, useRef, useState } from "react"
import { I18nManager, View, type ViewInstance } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { MenuView } from "@expo/ui/community/menu"
import type { MenuAction, MenuComponentRef, NativeActionEvent } from "@expo/ui/community/menu"
import { FillWidth } from "./fill-width"
import type { ContextMenuProps } from "./types"

export type { ContextMenuAction, ContextMenuProps, ContextMenuRef } from "./types"

// Non-iOS: Material dropdowns. A tap menu wraps its content as the trigger and opens from its edge.
// A long-press menu opens at the press, as Compose apps do with DropdownMenu's `offset`, which Expo UI doesn't expose.
// The content's own onLongPress calls `ref.show()`: its touchable takes the touch before a menu trigger would see it.
// Without a ref, long press is left to the caller.
export function ContextMenu(props: ContextMenuProps) {
  const { ref, children, actions, mode = "longPress", style, fillWidth = false, disabled = false } = props

  if (disabled || actions.length === 0 || (mode === "longPress" && !ref)) {
    return style ? <View style={style}>{children}</View> : <>{children}</>
  }

  if (mode === "longPress") {
    return <LongPressMenu {...props} />
  }

  if (fillWidth) {
    return (
      <FillWidth style={style}>
        {(width) => (
          <TapMenu {...props} style={undefined}>
            <View style={{ width }}>{children}</View>
          </TapMenu>
        )}
      </FillWidth>
    )
  }

  return <TapMenu {...props} />
}

function TapMenu({ children, actions, style, onPressAction }: ContextMenuProps) {
  return (
    <MenuView actions={toMenuActions(actions)} style={style} onPressAction={pressHandler(actions, onPressAction)}>
      {children}
    </MenuView>
  )
}

// The menu anchors to a 1×1 point moved to where the content was touched, so it opens under the finger
// and Compose still flips it to fit the screen. The anchor mounts on the first long press.
function LongPressMenu({ ref, children, actions, style, onPressAction }: ContextMenuProps) {
  const containerRef = useRef<ViewInstance>(null)
  const menuRef = useRef<MenuComponentRef>(null)
  // Cleared on release, so a long press from an accessibility action doesn't reuse an old touch
  const touchRef = useRef<{ pageX: number; pageY: number }>(undefined)
  const [anchor, setAnchor] = useState<{ start: number; top: number }>()

  useImperativeHandle(
    ref,
    () => ({
      show: () => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        const touch = touchRef.current
        // Without a touch, open from the bottom start corner, as a dropdown does
        const x = touch ? touch.pageX - rect.left : I18nManager.isRTL ? rect.width : 0
        const y = touch ? touch.pageY - rect.top : rect.height
        // The menu opens toward the end, so in RTL the anchor's right edge sits on the touch
        setAnchor({ start: I18nManager.isRTL ? rect.width - x : x, top: y })
      },
    }),
    [],
  )

  // Opens once the anchor is in place, so the menu doesn't appear at the previous press first
  useEffect(() => {
    if (anchor) menuRef.current?.show()
  }, [anchor])

  const clearTouch = () => {
    touchRef.current = undefined
  }

  return (
    <View
      ref={containerRef}
      style={style}
      onTouchStart={({ nativeEvent }) => {
        touchRef.current = { pageX: nativeEvent.pageX, pageY: nativeEvent.pageY }
      }}
      onTouchEnd={clearTouch}
      onTouchCancel={clearTouch}
    >
      {children}
      {anchor && (
        <MenuView
          ref={menuRef}
          actions={toMenuActions(actions)}
          shouldOpenOnLongPress
          style={[styles.anchor, anchor]}
          onPressAction={pressHandler(actions, onPressAction)}
        >
          <View style={styles.anchorPoint} />
        </MenuView>
      )}
    </View>
  )
}

function toMenuActions(actions: ContextMenuProps["actions"]): MenuAction[] {
  return actions.map((action, index) => ({
    id: String(index),
    title: action.title,
    state: action.selected ? "on" : undefined,
    attributes: { destructive: action.destructive, disabled: action.disabled },
  }))
}

function pressHandler(actions: ContextMenuProps["actions"], onPressAction?: () => void) {
  return ({ nativeEvent }: NativeActionEvent) => {
    onPressAction?.()
    actions[Number(nativeEvent.event)]?.onPress()
  }
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    pointerEvents: "none",
  },
  anchorPoint: {
    width: 1,
    height: 1,
  },
})
