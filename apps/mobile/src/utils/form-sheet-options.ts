import { color } from "@/theme"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"

export const formSheetOptions = {
  presentation: "formSheet" as const,
  headerShown: false,
  sheetAllowedDetents: "fitToContents" as const,
  contentStyle: { backgroundColor: isLiquidGlassSupported ? "transparent" : color.background },
  sheetGrabberVisible: true,
}
