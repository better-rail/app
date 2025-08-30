import React from "react"
import { Platform } from "react-native"
import ContextMenuView from "react-native-context-menu-view"

export interface RouteContextMenuAction {
  title: string
  systemIcon?: string
  onPress: () => void
}

export interface RouteContextMenuProps {
  children: React.ReactNode
  actions: RouteContextMenuAction[]
  onLongPress?: () => void
  disabled?: boolean
}

export const RouteContextMenu = function RouteContextMenu(props: RouteContextMenuProps) {
  const { children, actions, onLongPress, disabled = false } = props

  // If disabled or no actions, just return children
  if (disabled || !actions || actions.length === 0) {
    return <>{children}</>
  }

  // On iOS, use ContextMenuView
  if (Platform.OS === 'ios') {
    return (
      <ContextMenuView
        actions={actions.map(action => ({
          title: action.title,
          systemIcon: action.systemIcon,
        }))}
        onPress={(e) => {
          const { index } = e.nativeEvent
          const action = actions[index]
          if (action) {
            action.onPress()
          }
        }}
      >
        {children}
      </ContextMenuView>
    )
  }

  // On Android, just return children (onLongPress should be handled by the child component)
  return <>{children}</>
}