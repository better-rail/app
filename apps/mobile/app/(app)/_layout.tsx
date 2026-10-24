import { Stack } from "expo-router/stack"
import { SplitColumnSafeArea } from "@/components/horizontal-safe-area/horizontal-safe-area"

export default function AppLayout() {
  return (
    <SplitColumnSafeArea>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        <Stack.Screen name="active-ride" options={{ presentation: "modal" }} />
        <Stack.Screen name="announcements" options={{ presentation: "modal" }} />
        <Stack.Screen name="voucher" options={{ presentation: "modal" }} />
        <Stack.Screen name="live-announcement" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="widget-onboarding" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="paywall" options={{ presentation: "fullScreenModal" }} />
      </Stack>
    </SplitColumnSafeArea>
  )
}
