import { Stack } from "expo-router/stack"
import { type TextStyle } from "react-native"
import { color, spacing, typography } from "@/theme"
import { translate } from "@/i18n"
import { CloseButton } from "@/components"
import { useRouter } from "expo-router"

const iOSTitleStyle: TextStyle = {
  fontSize: 19,
  fontFamily: typography.primary,
  fontWeight: "400",
  marginRight: 10,
}

export default function ServiceStatusLayout() {
  const router = useRouter()

  return (
    <Stack
      screenOptions={{
        headerTintColor: color.primary as unknown as string,
        headerBackButtonDisplayMode: "minimal",
        headerTitleStyle: iOSTitleStyle,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: translate("serviceStatus.title") ?? "",
          headerLeft: () => <CloseButton onPress={() => router.back()} style={{ marginRight: spacing[5] }} />,
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
      <Stack.Screen name="map" options={{ title: translate("serviceStatus.networkMap") ?? "" }} />
      <Stack.Screen name="[lineId]" options={{ title: "" }} />
    </Stack>
  )
}
