import { Stack } from "expo-router/stack"
import { Platform } from "react-native"
import { useRouter } from "expo-router"
import { translate } from "@/i18n"
import { CloseButton } from "@/components"

export default function WidgetOnboardingLayout() {
  const router = useRouter()

  const closeButtonOptions = {
    headerShown: true,
    ...(Platform.OS === "ios"
      ? {
          unstable_headerLeftItems: () => [
            {
              type: "button" as const,
              label: translate("common.close") ?? "Close",
              icon: { type: "sfSymbol" as const, name: "xmark" as const },
              tintColor: "white",
              onPress: () => router.dismiss(),
            },
          ],
        }
      : { headerLeft: () => <CloseButton onPress={() => router.dismiss()} iconStyle={{ tintColor: "#ffffff" }} /> }),
  }

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: "#ffffff55",
        title: "",
      }}
    >
      <Stack.Screen name="index" options={closeButtonOptions} />
      <Stack.Screen name="step-1" />
      <Stack.Screen name="step-2" />
      <Stack.Screen name="step-3" />
    </Stack>
  )
}
