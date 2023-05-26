import { View, ViewStyle, useColorScheme } from "react-native"
import { BlurView } from "@react-native-community/blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { color } from "../../theme"
import { ReactNode } from "react"

const SHEET_CONTAINER: ViewStyle = {
  height: 75,
  paddingHorizontal: 20,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  position: "absolute",
  width: "100%",
  borderTopColor: color.separator,
  borderTopWidth: 1,
}

export function BottomScreenSheet({ children, style }: { children: ReactNode; style?: ViewStyle }) {
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
      <BlurView
        style={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0, zIndex: -1 }}
        blurType={isDarkMode ? "ultraThinMaterialDark" : "xlight"}
        blurAmount={30}
        reducedTransparencyFallbackColor={color.tertiaryBackground as unknown as string}
      />
    </View>
  )
}
