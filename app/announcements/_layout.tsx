import { Stack } from "expo-router/stack"
import { Image, Pressable, type TextStyle } from "react-native"
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
            <Pressable onPress={() => router.push("/announcements/notifications-setup")}>
              <Image
                source={require("../../assets/bell.png")}
                style={{
                  width: 24,
                  height: 27,
                  marginRight: spacing[3],
                  opacity: 0.6,
                  tintColor: "#e67e22",
                }}
              />
            </Pressable>
          ),
          headerLeft: () => <CloseButton onPress={() => router.back()} style={{ marginRight: spacing[5] }} />,
          unstable_headerLeftItems: () => [
            {
              type: "button",
              label: translate("common.close") ?? "Close",
              icon: { type: "sfSymbol", name: "xmark" },
              onPress: () => router.back(),
            },
          ],
          headerTitleStyle: iOSTitleStyle,
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
      <Stack.Screen name="notifications-stations" options={{ title: "Select Stations", headerShown: false }} />
    </Stack>
  )
}
