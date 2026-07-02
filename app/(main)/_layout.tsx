import { Stack } from "expo-router/stack"
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
  return (
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
      <Stack.Screen name="train-info" options={formSheetOptions} />
      <Stack.Screen name="live-permissions" options={formSheetOptions} />
    </Stack>
  )
}
