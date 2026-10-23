import type { ComponentProps } from "react"
import type { Stack } from "expo-router/stack"
import { color } from "@/theme"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"

/** A native stack screen's options, as `Stack.Screen` takes them (the object form, not the function). */
type NativeStackNavigationOptions = Exclude<
  NonNullable<ComponentProps<typeof Stack.Screen>["options"]>,
  (...args: never[]) => unknown
>

/** A sheet that sits as tall as its content: the filter, the fares, the train info and their like. */
export const formSheetOptions: NativeStackNavigationOptions = {
  presentation: "formSheet",
  headerShown: false,
  sheetAllowedDetents: "fitToContents",
  contentStyle: { backgroundColor: isLiquidGlassSupported ? "transparent" : color.background },
  sheetGrabberVisible: true,
}

/**
 * A station's card: a long page, so the sheet opens to most of the screen and grows to the whole
 * of it when scrolled, like a place card in Apple Maps.
 */
export const stationSheetOptions: NativeStackNavigationOptions = {
  ...formSheetOptions,
  sheetAllowedDetents: [0.7, 1],
  sheetInitialDetentIndex: 0,
  contentStyle: { backgroundColor: color.background },
}
