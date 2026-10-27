import { useMemo } from "react"
import { Platform } from "react-native"
import { Stack } from "expo-router/stack"
import { useIsWideLayout } from "@/hooks/use-is-wide-layout"
import { ThemeProvider, useTheme } from "expo-router/react-navigation"
import { color, typography } from "@/theme"
import { formSheetOptions } from "@/utils/form-sheet-options"

export default function MainLayout() {
  const theme = useTheme()
  const isWideWindow = useIsWideLayout()
  // The route list header sits over a dark photo, so its glass buttons stay dark in light mode too.
  const darkHeaderTheme = useMemo(() => ({ ...theme, dark: true }), [theme])

  return (
    <ThemeProvider value={darkHeaderTheme}>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: "minimal",
          headerBackButtonMenuEnabled: false,
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
          // A sheet where there's room for one (iPhone Duo's open inner display, iPads); the full screen on phones.
          options={{
            headerShown: false,
            ...(isWideWindow && Platform.OS === "ios"
              ? { presentation: "formSheet" as const, sheetAllowedDetents: [1], sheetGrabberVisible: false }
              : { presentation: "fullScreenModal" as const }),
          }}
        />
        <Stack.Screen name="route-list" options={{ headerShown: false }} />
        <Stack.Screen name="route-details" options={{ headerShown: false }} />
        <Stack.Screen name="station-hours" options={formSheetOptions} />
        <Stack.Screen name="filter" options={formSheetOptions} />
        <Stack.Screen name="fares" options={formSheetOptions} />
        <Stack.Screen name="train-info-prompt" options={formSheetOptions} />
        <Stack.Screen name="live-permissions" options={formSheetOptions} />
      </Stack>
    </ThemeProvider>
  )
}
