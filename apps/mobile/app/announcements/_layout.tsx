import { Stack } from "expo-router/stack"
import { useUnistyles } from "react-native-unistyles"
import { type TextStyle } from "react-native"
import { spacing } from "@/theme"
import { translate } from "@/i18n"
import { CloseButton } from "@/components"
import { useRouter } from "expo-router"
import { headingFontStyle } from "@/theme/theme-fonts"

const iOSTitleStyle: TextStyle = {
  marginRight: 10,
}

export default function AnnouncementsLayout() {
  const { theme: appTheme } = useUnistyles()
  const router = useRouter()
  const titleStyle: TextStyle = { ...iOSTitleStyle, ...headingFontStyle(appTheme, 19, "400") }

  return (
    <Stack
      screenOptions={{
        headerTintColor: appTheme.colors.primary as unknown as string,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: translate("routes.updates") ?? "",
          headerLeft: () => <CloseButton onPress={() => router.back()} style={{ marginRight: spacing[5] }} />,
          unstable_headerLeftItems: () => [
            {
              type: "button",
              label: translate("common.close") ?? "Close",
              icon: { type: "sfSymbol", name: "xmark" },
              onPress: () => router.back(),
            },
          ],
          headerTitleStyle: titleStyle,
        }}
      />
      <Stack.Screen
        name="urgent"
        options={{
          title: translate("routes.updates") ?? "",
          headerLeft: () => <CloseButton onPress={() => router.back()} style={{ marginRight: spacing[2] }} />,
          unstable_headerLeftItems: () => [
            {
              type: "button",
              label: translate("common.close") ?? "Close",
              icon: { type: "sfSymbol", name: "xmark" },
              onPress: () => router.back(),
            },
          ],
          headerTitleStyle: titleStyle,
        }}
      />
    </Stack>
  )
}
