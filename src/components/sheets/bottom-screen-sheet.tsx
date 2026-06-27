import type { ReactNode } from "react"
import { Platform, PlatformColor, View, type ViewStyle, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { BlurView } from "expo-blur"
import { isDarkMode } from "@/theme"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"

const androidSeparatorColor = isDarkMode ? "#454545" : "#c6c6c6"

interface BottomScreenSheetProps {
  children: ReactNode
  style?: ViewStyle
}

export function BottomScreenSheet({ children, style }: BottomScreenSheetProps) {
  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"

  return (
    <View style={[styles.sheetContainer, style]}>
      {children}
      {Platform.OS === "ios" && !isLiquidGlassSupported && (
        <BlurView
          style={styles.overlay}
          tint={isDarkMode ? "systemThickMaterialDark" : "systemThickMaterialLight"}
          intensity={70}
        />
      )}
      {Platform.OS === "ios" && isLiquidGlassSupported && (
        <LiquidGlassView
          style={styles.overlay}
          tintColor={isDarkMode ? PlatformColor("systemThickMaterialDark") : PlatformColor("systemThickMaterialLight")}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  sheetContainer: {
    height: rt.insets.bottom > 0 ? rt.insets.bottom + 60 : 75,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "absolute",
    width: "100%",
    borderTopColor: Platform.OS === "ios" ? theme.colors.separator : androidSeparatorColor,
    borderTopWidth: 1,
    backgroundColor: Platform.OS === "android" ? theme.colors.tertiaryBackground : undefined,
    paddingBottom: rt.insets.bottom > 0 ? 25 : 0,
    bottom: 0,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: -1,
  },
}))
