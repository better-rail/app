import { Alert, Image, Platform, PlatformColor, Pressable, ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { usePathname, useRouter } from "expo-router"
import { GlassView } from "expo-glass-effect"
import HapticFeedback from "react-native-haptic-feedback"
import { translate } from "@/i18n"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { getCurrentTrainIndex } from "@/utils/helpers/ride-helpers"
import { trackEvent } from "@/services/analytics"
import type { RouteItem } from "@/services/api"

const preventLongPressNavigation = () => undefined

/** Opens the wagon layout of the route's trains, so riders can find the accessible and bicycle wagons. */
export function TrainInfoButton({ routeItem, style }: { routeItem: RouteItem; style: ViewStyle }) {
  const router = useRouter()
  const pathname = usePathname()
  const hasWagonData = routeItem.trains.some((train) => (train.visaWagonData?.wagons?.length ?? 0) > 0)

  const onPress = () => {
    if (!hasWagonData) {
      Alert.alert(translate("routeDetails.trainInformation") ?? "", translate("routeDetails.noTrainDetails") ?? "")
      return
    }
    trackEvent("train_info_sheet_opened")
    HapticFeedback.trigger("impactLight")
    useNavigationParamsStore.getState().setTrainInfo(routeItem.trains, getCurrentTrainIndex(routeItem))
    // The active ride is a modal, so the sheet has to join its stack to show above it
    router.push(pathname.includes("active-ride") ? "/active-ride/train-info" : "/train-info")
  }

  return (
    <Pressable
      testID="train-info-button"
      // Without an onLongPress handler, Pressable treats a long hold as
      // a regular press on release and presents the sheet mid-gesture.
      onLongPress={preventLongPressNavigation}
      onPress={onPress}
      accessibilityLabel={translate("routeDetails.trainInformation") ?? undefined}
      accessibilityHint={!hasWagonData ? (translate("routeDetails.noTrainDetails") ?? undefined) : undefined}
    >
      <GlassView
        style={style}
        isInteractive={hasWagonData}
        glassEffectStyle="regular"
        tintColor={Platform.OS === "ios" ? PlatformColor("tertiarySystemBackground") : undefined}
      >
        <Image
          source={require("../../../../assets/info.circle.png")}
          style={[styles.icon, !hasWagonData && styles.iconDisabled]}
        />
      </GlassView>
    </Pressable>
  )
}

const styles = StyleSheet.create((theme) => ({
  icon: {
    width: 24,
    height: 24,
    tintColor: theme.colors.text,
  },
  // Dims only the icon, so the button surface stays opaque over the route
  iconDisabled: {
    opacity: 0.4,
  },
}))
