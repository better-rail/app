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
}

export default function SettingsLayout() {
  const router = useRouter()

  return (
    <Stack
      screenOptions={{
        headerTintColor: color.primary as unknown as string,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: translate("settings.title") ?? "",
          headerLeft: () => <CloseButton onPress={() => router.back()} style={{ marginRight: spacing[2] }} />,
          headerTitleStyle: iOSTitleStyle,
        }}
      />
      <Stack.Screen name="language" options={{ title: translate("settings.language") ?? "", headerTitleStyle: iOSTitleStyle }} />
      <Stack.Screen name="ui-settings" options={{ title: translate("settings.uiSettings") ?? "", headerTitleStyle: iOSTitleStyle }} />
      <Stack.Screen name="tip-jar" options={{ title: translate("settings.tipJar") ?? "", headerTitleStyle: iOSTitleStyle }} />
      <Stack.Screen name="about" options={{ title: translate("settings.about") ?? "", headerTitleStyle: iOSTitleStyle }} />
      <Stack.Screen name="privacy" options={{ title: translate("settings.privacy") ?? "", headerTitleStyle: iOSTitleStyle }} />
    </Stack>
  )
}
