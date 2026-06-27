import { StyleSheet } from "react-native-unistyles"
import { lightTheme, darkTheme } from "./themes"

/**
 * Unistyles runtime configuration.
 *
 * Imported once, before the React tree mounts (see the first import in `app/_layout.tsx`).
 * Must run before any component that reads Unistyles styles renders.
 */

const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
} as const

type AppThemes = {
  light: typeof lightTheme
  dark: typeof darkTheme
}

type AppBreakpoints = typeof breakpoints

declare module "react-native-unistyles" {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  breakpoints,
  settings: {
    // Follow the OS appearance automatically (the app's `userInterfaceStyle` is "automatic").
    adaptiveThemes: true,
  },
})
