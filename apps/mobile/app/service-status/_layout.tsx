import { Stack } from "expo-router/stack"
import { Image, type TextStyle, TouchableOpacity } from "react-native"
import { useRouter } from "expo-router"
import { TrueSheet } from "@lodev09/react-native-true-sheet"
import { color, spacing, typography } from "@/theme"
import { translate } from "@/i18n"
import { CloseButton } from "@/components"
import { trackEvent } from "@/services/analytics"
import { LEGEND_SHEET } from "@/screens/service-status/components/legend-sheet"

const INFO_ICON = require("../../assets/info.circle.png")

const iOSTitleStyle: TextStyle = {
  fontSize: 19,
  fontFamily: typography.primary,
  fontWeight: "400",
  marginRight: 10,
}

export default function ServiceStatusLayout() {
  const router = useRouter()

  const close = () => router.back()
  const openLegend = () => {
    trackEvent("service_status_legend_opened")
    TrueSheet.present(LEGEND_SHEET)
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: translate("serviceStatus.title") ?? "",
          // The map runs under the bar; the screen blurs it there and keeps its content clear of it.
          headerTransparent: true,
          headerTintColor: color.primary as unknown as string,
          headerTitleStyle: iOSTitleStyle,
          headerLeft: () => <CloseButton onPress={close} style={{ marginRight: spacing[5] }} />,
          unstable_headerLeftItems: () => [
            {
              type: "button",
              label: translate("common.close") ?? "Close",
              icon: { type: "sfSymbol", name: "xmark" },
              onPress: close,
            },
          ],
          // "What do the markings mean": the legend, on a sheet of its own.
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
        }}
      />
    </Stack>
  )
}
