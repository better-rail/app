import { Alert, Image, Platform, PlatformColor, Pressable, ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { GlassView } from "expo-glass-effect"
import HapticFeedback from "react-native-haptic-feedback"
import { translate } from "@/i18n"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { getCurrentTrainIndex } from "@/utils/helpers/ride-helpers"
import { trackEvent } from "@/services/analytics"
import type { RouteItem } from "@/services/api"

const preventLongPressNavigation = () => undefined

/** Opens the train composition sheet (accessible, bike and quiet cars) for the route's current train. */
export function TrainInfoButton({ route, style }: { route: RouteItem; style: ViewStyle }) {
  const router = useRouter()
  const hasWagonData = route.trains.some((train) => (train.visaWagonData?.wagons?.length ?? 0) > 0)

  return (
    <Pressable
      testID="train-info-button"
      // Without an onLongPress handler, Pressable treats a long hold as
      // a regular press on release and presents the sheet mid-gesture.
      onLongPress={preventLongPressNavigation}
      onPress={() => {
        if (hasWagonData) {
          trackEvent("train_info_sheet_opened")
          HapticFeedback.trigger("impactLight")
          useNavigationParamsStore.getState().setTrainInfo(route.trains, getCurrentTrainIndex(route))
          router.push("/train-info")
        } else {
          Alert.alert(translate("routeDetails.trainInformation") ?? "", translate("routeDetails.noTrainDetails") ?? "")
        }
      }}
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
