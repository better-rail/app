import { Stack } from "expo-router/stack"
import { useRouter } from "expo-router"
import { CloseButton } from "@/components"
import { translate, userLocale } from "@/i18n"
import { spacing } from "@/theme"
import { statsHeaderOptions } from "@/screens/statistics/statistics-palette"

export default function StatisticsLayout() {
  const router = useRouter()

  return (
    <Stack
      screenOptions={{
        ...statsHeaderOptions,
        headerTitleStyle:
          userLocale === "en"
            ? { ...statsHeaderOptions.headerTitleStyle, fontFamily: "BebasNeue", fontSize: 24 }
            : statsHeaderOptions.headerTitleStyle,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: translate("statistics.title") ?? "",
          headerTitle: "",
          scrollEdgeEffects: { top: "hidden" },
          // Android fallback — overridden by unstable_headerLeftItems on iOS
          headerLeft: () => <CloseButton onPress={() => router.back()} style={{ marginRight: spacing[2] }} />,
          unstable_headerLeftItems: () => [
            {
              type: "button",
              label: translate("common.close") ?? "Close",
              icon: { type: "sfSymbol", name: "xmark" },
              onPress: () => router.back(),
            },
          ],
        }}
      />
      <Stack.Screen name="usual-train" options={{ title: "" }} />
      <Stack.Screen name="history" options={{ title: translate("statistics.history") ?? "" }} />
      <Stack.Screen name="week-delays" options={{ title: translate("statistics.weekDelays") ?? "" }} />
      <Stack.Screen
        name="ride"
        options={{
          presentation: "modal",
          title: "",
          headerLeft: () => <CloseButton onPress={() => router.back()} style={{ marginRight: spacing[2] }} />,
          unstable_headerLeftItems: () => [
            {
              type: "button",
              label: translate("common.close") ?? "Close",
              icon: { type: "sfSymbol", name: "xmark" },
              onPress: () => router.back(),
            },
          ],
        }}
      />
    </Stack>
  )
}
