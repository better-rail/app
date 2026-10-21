import { requireNativeView } from "expo"
import { Platform } from "react-native"
import type { ColorValue, NativeSyntheticEvent } from "react-native"

export interface NavigationBarItem {
  id: string
  title?: string
  /** SF Symbol name */
  systemImage?: string
  tintColor?: ColorValue
  accessibilityLabel?: string
}

export interface NavigationBarItemsProps {
  /** Leading to trailing */
  items: NavigationBarItem[]
  onItemPress: (event: NativeSyntheticEvent<{ id: string }>) => void
}

/**
 * Sets the trailing items of the native navigation bar above the view controller it's rendered in (iOS only).
 * For screens outside a native stack, like the split view's sidebar column.
 */
export const NavigationBarItems =
  Platform.OS === "ios"
    ? requireNativeView<NavigationBarItemsProps>("NavigationBarItems")
    : (_props: NavigationBarItemsProps) => null
