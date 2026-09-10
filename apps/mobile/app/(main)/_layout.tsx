import { useMemo } from "react"
import { Stack } from "expo-router/stack"
import { ThemeProvider, useTheme } from "expo-router/react-navigation"
import { color, typography } from "@/theme"
import { isLiquidGlassSupported } from "@callstack/liquid-glass"

const formSheetOptions = {
  presentation: "formSheet" as const,
  headerShown: false,
  sheetAllowedDetents: "fitToContents" as const,
  contentStyle: { backgroundColor: isLiquidGlassSupported ? "transparent" : color.background },
  sheetGrabberVisible: true,
}

export default function MainLayout() {
  const theme = useTheme()
  // The route list header sits over a dark photo, so its glass buttons stay dark in light mode too.
  const darkHeaderTheme = useMemo(() => ({ ...theme, dark: true }), [theme])

  return (
    <ThemeProvider value={darkHeaderTheme}>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: "minimal",
          headerTitleStyle: {
            fontSize: 20,
            fontFamily: typography.primary,
          },
          headerBackTitleStyle: { fontFamily: typography.primary },
          headerTintColor: color.primary as unknown as string,
          headerTitle: "",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="select-station"
          options={{
            headerShown: false,
            presentation: "fullScreenModal",
          }}
        />
        <Stack.Screen name="route-list" options={{ headerShown: false }} />
        <Stack.Screen name="route-details" options={{ headerShown: false }} />
        <Stack.Screen name="station-hours" options={formSheetOptions} />
        <Stack.Screen name="filter" options={formSheetOptions} />
        <Stack.Screen name="fares" options={formSheetOptions} />
        <Stack.Screen name="train-info" options={formSheetOptions} />
        <Stack.Screen name="train-info-prompt" options={formSheetOptions} />
        <Stack.Screen name="live-permissions" options={formSheetOptions} />
      </Stack>
    </ThemeProvider>
  )
}
