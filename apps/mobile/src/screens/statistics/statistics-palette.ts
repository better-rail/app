import { Platform } from "react-native"
import { typography } from "@/theme"

/** The statistics screens use their own deep-blue look, so they stand apart from the rest of the app */
export const statsPalette = {
  background: "#10153A",
  gradientTop: "#24206B",
  gradientBottom: "#080B22",
  card: "#1B2152",
  glassTint: "rgba(27, 33, 82, 0.45)",
  cardRaised: "#262D6B",
  pill: "#2F3780",
  text: "#FFFFFF",
  muted: "#A9ADE0",
  accent: "#8B8FFF",
  accentSoft: "#DBDCFC",
  orange: "#FBA928",
  tomato: "#FF6347",
  green: "#5AD16B",
  track: "rgba(255, 255, 255, 0.12)",
  ghost: "rgba(255, 255, 255, 0.3)",
} as const

/** SF Pro Rounded for the big numbers on iOS; Heebo elsewhere */
export const statsNumberFont = Platform.select({ ios: { fontFamily: "ui-rounded" }, default: {} })

/** Header options for a screen that uses the palette */
export const statsHeaderOptions = {
  headerTransparent: true,
  headerTintColor: statsPalette.accentSoft,
  headerTitleStyle: { color: statsPalette.text, fontSize: 19, fontFamily: typography.primary, fontWeight: "400" },
} as const
