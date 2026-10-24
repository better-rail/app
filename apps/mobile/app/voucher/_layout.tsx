import { Stack } from "expo-router/stack"
import { useUnistyles } from "react-native-unistyles"
import { Platform } from "react-native"
import { useNavigation, useRouter } from "expo-router"
import { translate } from "@/i18n"
import { CloseButton } from "@/components"
import { closeVoucherFlow } from "@/screens/voucher/close-voucher-flow"
import { usePauseReplayWhileTyping } from "@/screens/voucher/use-pause-replay-while-typing"
import { spacing } from "@/theme"
import { headingFontStyle } from "@/theme/theme-fonts"

export default function VoucherLayout() {
  const { theme: appTheme } = useUnistyles()
  const router = useRouter()
  // Mounted for the whole sheet, so every keyboard in the flow is covered
  usePauseReplayWhileTyping()
  // The layout is the sheet itself, a screen of the root stack
  const navigation = useNavigation()

  const closeButtonOptions =
    Platform.OS === "ios"
      ? {
          unstable_headerLeftItems: () => [
            {
              type: "button" as const,
              label: translate("common.close") ?? "Close",
              icon: { type: "sfSymbol" as const, name: "xmark" as const },
              onPress: () => closeVoucherFlow(navigation, router),
            },
          ],
        }
      : {
          headerLeft: () => (
            <CloseButton onPress={() => closeVoucherFlow(navigation, router)} style={{ marginEnd: spacing[3] }} />
          ),
        }

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: appTheme.colors.primary as unknown as string,
        headerTitleStyle: headingFontStyle(appTheme, 17, "normal"),
        contentStyle: { backgroundColor: appTheme.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: translate("voucher.orderTitle") ?? "", ...closeButtonOptions }} />
      <Stack.Screen name="code" options={{ title: "" }} />
      <Stack.Screen name="passengers" options={{ title: "" }} />
      {/* Ordering can't be undone by going back, so the voucher only closes */}
      <Stack.Screen
        name="ticket"
        options={{
          title: translate("voucher.title") ?? "",
          headerBackVisible: false,
          gestureEnabled: false,
          ...closeButtonOptions,
        }}
      />
    </Stack>
  )
}
