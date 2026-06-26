import { Stack } from "expo-router/stack"
import { Image, Platform, Pressable, type TextStyle } from "react-native"
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

export default function AnnouncementsLayout() {
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
          title: translate("routes.updates") ?? "",
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/announcements/notifications-setup")}
            >
              <Image
                source={require("../../assets/bell.png")}
                style={{
                  width: 24,
                  height: 27,
                  marginRight: spacing[3],
                  marginBottom: spacing[2],
                  opacity: 0.6,
                  tintColor: "#e67e22",
                }}
              />
            </Pressable>
          ),
          headerLeft: () => (
            <CloseButton
              onPress={() => router.back()}
              style={{ marginRight: Platform.select({ ios: spacing[2], android: spacing[5] }) }}
            />
          ),
          headerTitleStyle: iOSTitleStyle,
        }}
      />
      <Stack.Screen
        name="urgent"
        options={{
          title: translate("routes.updates") ?? "",
          headerLeft: () => <CloseButton onPress={() => router.back()} style={{ marginRight: spacing[2] }} />,
          headerTitleStyle: iOSTitleStyle,
        }}
      />
      <Stack.Screen
        name="notifications-setup"
        options={{
          title: translate("announcements.notifications.notificationSettings") ?? "",
          headerTitleStyle: iOSTitleStyle,
        }}
      />
      <Stack.Screen
        name="notifications-stations"
        options={{ title: "Select Stations", headerShown: false }}
      />
    </Stack>
  )
}
