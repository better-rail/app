import { Stack } from "expo-router/stack"
import { Platform } from "react-native"
import { useRouter } from "expo-router"
import { BlurView } from "expo-blur"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { CloseButton } from "@/components"
import { useIsDarkMode } from "@/hooks"

function LiveAnnouncementHeaderBackground() {
  const insets = useSafeAreaInsets()
  const isDarkMode = useIsDarkMode()
  const blurType = isDarkMode ? "systemMaterialDark" : "systemThinMaterialDark"

  return <BlurView style={{ height: insets.top }} tint={blurType} intensity={70} />
}

export default function LiveAnnouncementLayout() {
  const router = useRouter()

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBackground: () => (Platform.OS === "ios" ? <LiveAnnouncementHeaderBackground /> : null),
        title: "",
        ...(Platform.OS === "ios" && {
          headerLeft: () => (
            <CloseButton
              onPress={() => router.dismiss()}
              iconStyle={{
                width: 32.5,
                height: 32.5,
                tintColor: Platform.select({ ios: "white", android: "grey" }),
                opacity: 0.5,
                marginTop: 8,
              }}
            />
          ),
        }),
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="start-ride" />
      <Stack.Screen name="live-activity" />
      <Stack.Screen name="dynamic-island" />
      <Stack.Screen name="support-us" />
      <Stack.Screen name="zolly" />
    </Stack>
  )
}
