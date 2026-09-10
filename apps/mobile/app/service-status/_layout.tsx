import { Stack } from "expo-router/stack"
import type { ComponentProps } from "react"
import { Image, type TextStyle, TouchableOpacity } from "react-native"
import { color, spacing, typography } from "@/theme"
import { translate } from "@/i18n"
import { CloseButton } from "@/components"
import { useRouter } from "expo-router"
import { trackEvent } from "@/services/analytics"

const INFO_ICON = require("../../assets/info.circle.png")

type ScreenOptions = Exclude<ComponentProps<typeof Stack.Screen>["options"], undefined | ((...args: never[]) => unknown)>

const legendSheetOptions = {
  presentation: "formSheet" as const,
  headerShown: false,
  sheetAllowedDetents: "fitToContents" as const,
  sheetGrabberVisible: true,
  contentStyle: { backgroundColor: color.background },
}

const iOSTitleStyle: TextStyle = {
  fontSize: 19,
  fontFamily: typography.primary,
  fontWeight: "400",
  marginRight: 10,
}

export default function ServiceStatusLayout() {
  const router = useRouter()

  const openLegend = () => {
    trackEvent("service_status_legend_opened")
    router.push("/service-status/legend")
  }
  // The "what do the markings mean" button on the screens that show the map.
  const legendHeader: ScreenOptions = {
    headerRight: () => (
      <TouchableOpacity
        onPress={openLegend}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={translate("serviceStatus.legend.open") ?? undefined}
        hitSlop={12}
        testID="map-legend-button"
      >
        <Image source={INFO_ICON} style={{ width: 24, height: 24, tintColor: color.primary as unknown as string }} />
      </TouchableOpacity>
    ),
    unstable_headerRightItems: () => [
      {
        type: "button",
        label: translate("serviceStatus.legend.open") ?? "",
        icon: { type: "sfSymbol", name: "info.circle" },
        onPress: openLegend,
      },
    ],
  }

  return (
    <Stack
      screenOptions={{
        headerTintColor: color.primary as unknown as string,
        headerBackButtonDisplayMode: "minimal",
        headerTitleStyle: iOSTitleStyle,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: translate("serviceStatus.title") ?? "",
          headerLeft: () => <CloseButton onPress={() => router.back()} style={{ marginRight: spacing[5] }} />,
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
      <Stack.Screen name="map" options={{ title: translate("serviceStatus.networkMap") ?? "", ...legendHeader }} />
      <Stack.Screen name="[lineId]" options={{ title: "", ...legendHeader }} />
      <Stack.Screen name="legend" options={legendSheetOptions} />
    </Stack>
  )
}
