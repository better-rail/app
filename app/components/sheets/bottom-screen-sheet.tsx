import type { ReactNode } from "react"
import { Platform, View, type ViewStyle, useColorScheme } from "react-native"
import { BlurView } from "expo-blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { color, isDarkMode } from "../../theme"

const androidSeparatorColor = isDarkMode ? "#454545" : "#c6c6c6"

const SHEET_CONTAINER: ViewStyle = {
  height: 75,
  paddingHorizontal: 20,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  position: "absolute",
  width: "100%",
  borderTopColor: Platform.OS === "ios" ? color.separator : androidSeparatorColor,
  borderTopWidth: 1,
  backgroundColor: Platform.OS === "android" && color.tertiaryBackground,
}

interface BottomScreenSheetProps {
  children: ReactNode
  style?: ViewStyle
}

export function BottomScreenSheet({ children, style }: BottomScreenSheetProps) {
  const insets = useSafeAreaInsets()

  const colorScheme = useColorScheme()
  const isDarkMode = colorScheme === "dark"

  return (
    <View
      style={{
        ...SHEET_CONTAINER,
        height: insets.bottom > 0 ? insets.bottom + 60 : 75,
        paddingBottom: insets.bottom > 0 ? 25 : 0,
        bottom: 0,
        ...style,
      }}
    >
      {children}
      {Platform.OS === "ios" && (
        <BlurView
          style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0, zIndex: -1 }}
          tint={isDarkMode ? "systemUltraThinMaterialDark" : "extraLight"}
          intensity={20}
        />
      )}
    </View>
  )
}
