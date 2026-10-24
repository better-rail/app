import { Stack } from "expo-router/stack"
import { useUnistyles } from "react-native-unistyles"
import { type TextStyle } from "react-native"
import { spacing } from "@/theme"
import { translate } from "@/i18n"
import { CloseButton } from "@/components"
import { useRouter } from "expo-router"
import { headingFontStyle } from "@/theme/theme-fonts"

export default function SettingsLayout() {
  const { theme: appTheme } = useUnistyles()
  const router = useRouter()
  const titleStyle: TextStyle = headingFontStyle(appTheme, 19, "400")

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
          title: translate("settings.title") ?? "",
          headerTitleStyle: titleStyle,
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
      <Stack.Screen name="language" options={{ title: translate("settings.language") ?? "", headerTitleStyle: titleStyle }} />
      <Stack.Screen
        name="ui-settings"
        options={{ title: translate("settings.uiSettings") ?? "", headerTitleStyle: titleStyle }}
      />
      <Stack.Screen name="tip-jar" options={{ title: translate("settings.tipJar") ?? "", headerTitleStyle: titleStyle }} />
      <Stack.Screen name="about" options={{ title: translate("settings.about") ?? "", headerTitleStyle: titleStyle }} />
      <Stack.Screen name="privacy" options={{ title: translate("settings.privacy") ?? "", headerTitleStyle: titleStyle }} />
    </Stack>
  )
}
