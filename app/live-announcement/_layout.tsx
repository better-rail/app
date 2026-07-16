import { Stack } from "expo-router/stack"
import { Platform } from "react-native"
import { useRouter } from "expo-router"
import { translate } from "@/i18n"

export default function LiveAnnouncementLayout() {
  const router = useRouter()

  // iOS: show an X "close" button that dismisses the whole flow. Only applied to
  // entry screens (the first onboarding screen and the standalone zolly promo) —
  // the other screens are pushed on top and use the default back chevron instead.
  const closeButtonOptions =
    Platform.OS === "ios"
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
      : undefined

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        // Fully transparent header — no bottom shadow and no blurred background.
        // The screens' own title renders under the header, and both were hazing it.
        headerShadowVisible: false,
        title: "",
        ...(Platform.OS === "ios" && {
          // Keep the default back chevron visible against the dark background.
          headerTintColor: "white",
        }),
      }}
    >
      <Stack.Screen name="index" options={closeButtonOptions} />
      <Stack.Screen name="start-ride" />
      <Stack.Screen name="live-activity" />
      <Stack.Screen name="dynamic-island" />
      <Stack.Screen name="support-us" />
      <Stack.Screen name="zolly" options={closeButtonOptions} />
    </Stack>
  )
}
