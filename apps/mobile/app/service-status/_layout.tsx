import { Stack } from "expo-router/stack"
import type { TextStyle } from "react-native"
import { useRouter } from "expo-router"
import { color, spacing, typography } from "@/theme"
import { translate } from "@/i18n"
import { CloseButton } from "@/components"
import { stationSheetOptions } from "@/utils/sheet-options"

const iOSTitleStyle: TextStyle = {
  fontSize: 19,
  fontFamily: typography.primary,
  fontWeight: "400",
  marginRight: 10,
}

/** A link straight to a line or a station (a banner, a push) still gets the list of lines beneath it to go back to. */
export const unstable_settings = {
  initialRouteName: "index",
}

export default function ServiceStatusLayout() {
  const router = useRouter()

  const close = () => router.back()

  return (
    <Stack
      screenOptions={{
        headerTintColor: color.primary as unknown as string,
        headerTitleStyle: iOSTitleStyle,
        headerBackButtonDisplayMode: "minimal",
        headerBackButtonMenuEnabled: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: translate("serviceStatus.title") ?? "",
          headerLeft: () => <CloseButton onPress={close} style={{ marginRight: spacing[5] }} />,
          unstable_headerLeftItems: () => [
            {
              type: "button",
              label: translate("common.close") ?? "Close",
              icon: { type: "sfSymbol", name: "xmark" },
              onPress: close,
            },
          ],
        }}
      />
      <Stack.Screen name="line" options={{ title: translate("serviceStatus.lineDetails") ?? "" }} />
      <Stack.Screen name="station" options={stationSheetOptions} />
    </Stack>
  )
}
