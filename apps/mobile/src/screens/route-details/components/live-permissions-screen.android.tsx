import { Alert, Linking, View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Button, Column, FilledTonalButton, Host, Icon, ListItem, Text as ComposeText } from "@expo/ui/jetpack-compose"
import { clip, fillMaxWidth, height, Shapes } from "@expo/ui/jetpack-compose/modifiers"
import { Text } from "@/components"
import { primaryFont } from "@/theme"
import { translate } from "@/i18n"
import { useShallow } from "zustand/react/shallow"
import { useRideStore } from "@/models"
import { liveRideNotifications } from "@/modules/live-ride"
import { openArrivalAlarmSettings } from "@/utils/arrival-alarm-native"
import HapticFeedback from "react-native-haptic-feedback"
import { trackEvent } from "@/services/analytics"
import { requestStoreReview } from "@/utils/helpers/store-review-helpers"
import { useRouter } from "expo-router"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"

const CHECK_ICON = require("../../../../assets/check.xml")

export function LivePermissionsScreen() {
  const { theme, rt } = useUnistyles()
  const router = useRouter()
  const routeItem = useNavigationParamsStore((s) => s.routeItem)
  const {
    notificationPermissionState,
    checkLiveRideAuthorization,
    startRide,
    stopRide,
    id: rideId,
    rideCount,
  } = useRideStore(
    useShallow((s) => ({
      notificationPermissionState: s.notificationPermissionState,
      checkLiveRideAuthorization: s.checkLiveRideAuthorization,
      startRide: s.startRide,
      stopRide: s.stopRide,
      id: s.id,
      rideCount: s.rideCount,
    })),
  )

  const grantNotifications = async () => {
    await liveRideNotifications.requestPermissions()
    return checkLiveRideAuthorization()
  }

  const grantAlarms = () => {
    openArrivalAlarmSettings("permissions")
  }

  const grantPromoted = () => {
    Linking.openSettings()
  }

  const beginRide = () => {
    if (!routeItem) return
    HapticFeedback.trigger("notificationSuccess")
    startRide(routeItem)
    trackEvent("start_live_ride")

    if (rideCount === 3) {
      requestStoreReview().then(() => {
        trackEvent("start_live_ride_in_app_review_prompt")
      })
    }

    router.back()
  }

  const onStartRide = () => {
    if (rideId) {
      Alert.alert(translate("ride.rideExistsTitle") ?? "", translate("ride.rideExistsMessage") ?? "", [
        {
          style: "cancel",
          text: translate("common.cancel") ?? undefined,
        },
        {
          text: translate("ride.startNewRide") ?? undefined,
          onPress: async () => {
            await stopRide(rideId)
            beginRide()
          },
        },
      ])
      return
    }

    beginRide()
  }

  const notificationsGranted = Boolean(notificationPermissionState?.granted)
  const alarmsGranted = Boolean(notificationPermissionState?.canScheduleExactAlarms)
  const promotedGranted = Boolean(notificationPermissionState?.canPromoteOngoing)

  const permissions = [
    { label: translate("ride.notificationPermission3") ?? "", permitted: notificationsGranted, onPress: grantNotifications },
    { label: translate("ride.notificationPermission4") ?? "", permitted: alarmsGranted, onPress: grantAlarms },
  ]

  if (notificationPermissionState?.canPromoteOngoing !== undefined) {
    permissions.push({
      label: translate("ride.notificationPermissionLiveUpdates") ?? "",
      permitted: promotedGranted,
      onPress: grantPromoted,
    })
  }

  const canStartRide = notificationsGranted && alarmsGranted

  return (
    <View style={styles.wrapper}>
      <Text tx="ride.notificationPermission1" style={styles.text} />
      <Text tx="ride.notificationPermission2" style={styles.text} />

      <Host
        matchContents={{ vertical: true }}
        colorScheme={rt.themeName === "dark" ? "dark" : "light"}
        seedColor={theme.colors.primary}
        style={styles.host}
      >
        <Column verticalArrangement={{ spacedBy: 24 }}>
          <Column verticalArrangement={{ spacedBy: 2 }}>
            {permissions.map((permission, index) => (
              <PermissionRow
                key={permission.label}
                {...permission}
                shape={rowShape(index === 0, index === permissions.length - 1)}
              />
            ))}
          </Column>
          <Button
            onClick={onStartRide}
            enabled={canStartRide}
            colors={{
              containerColor: theme.colors.primary,
              contentColor: theme.colors.whiteText,
              disabledContainerColor: theme.colors.disabled,
              disabledContentColor: theme.colors.whiteText,
            }}
            modifiers={[fillMaxWidth(), height(56)]}
          >
            <ComposeText style={{ ...TEXT_STYLE, fontSize: 18, fontWeight: "500" }}>
              {translate("liveAnnounce.startRide.title")}
            </ComposeText>
          </Button>
        </Column>
      </Host>
    </View>
  )
}

const TEXT_STYLE = { fontFamily: primaryFont, fontSize: 17 }

// Grouped rows, as in Android 16 Settings: large outer corners, small inner ones
const rowShape = (isFirst: boolean, isLast: boolean) =>
  Shapes.RoundedCorner({
    topStart: isFirst ? 20 : 4,
    topEnd: isFirst ? 20 : 4,
    bottomStart: isLast ? 20 : 4,
    bottomEnd: isLast ? 20 : 4,
  })

type PermissionRowProps = {
  label: string
  permitted: boolean
  onPress: () => void
  shape: ReturnType<typeof Shapes.RoundedCorner>
}

const PermissionRow = ({ label, permitted, onPress, shape }: PermissionRowProps) => {
  const { theme } = useUnistyles()

  return (
    <ListItem colors={{ containerColor: theme.colors.inputBackground }} modifiers={[clip(shape)]}>
      <ListItem.HeadlineContent>
        <ComposeText style={TEXT_STYLE}>{label}</ComposeText>
      </ListItem.HeadlineContent>
      <ListItem.TrailingContent>
        {permitted ? (
          <Icon source={CHECK_ICON} size={24} tint={theme.colors.success} />
        ) : (
          <FilledTonalButton onClick={onPress}>
            <ComposeText style={{ ...TEXT_STYLE, fontSize: 16 }}>{translate("common.allow")}</ComposeText>
          </FilledTonalButton>
        )}
      </ListItem.TrailingContent>
    </ListItem>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  wrapper: {
    minHeight: 420,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[5],
    paddingBottom: rt.insets.bottom + theme.spacing[4],
    alignItems: "center",
    gap: 16,
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  text: {
    fontSize: 18,
    textAlign: "center",
    color: theme.colors.text,
  },
  host: {
    alignSelf: "stretch",
  },
}))
