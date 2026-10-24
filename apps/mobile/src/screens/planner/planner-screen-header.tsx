import { useEffect, useState } from "react"
import { Image, Platform, TouchableOpacity, View } from "react-native"
import type { ColorValue, ViewStyle } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Stack, useRouter } from "expo-router"
import type { SFSymbol } from "sf-symbols-typescript"
import * as storage from "@/utils/storage"
import { trackEvent } from "@/services/analytics"
import { spacing } from "@/theme"
import { Chip, Text } from "@/components"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useRideStore, useSettingsStore, filterUnseenUrgentMessages } from "@/models"
import { translate, userLocale } from "@/i18n"
import { ImportantAnnouncementBar } from "./Important-announcement-bar"
import { railApi } from "@/services/api"
import { HIDE_RAIL_SERVICE_UPDATES } from "@/config/features"
import { useQuery } from "react-query"
import { head, isEmpty } from "lodash"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { UpcomingVoucherChip, useUpcomingVoucherAction } from "./upcoming-voucher-chip"
import { NavigationBarItems } from "../../../modules/navigation-bar-items"

const SPARKLES_ICON = require("../../../assets/sparkles.png")
const UPDATES_ICON = require("../../../assets/updates.png")
const SETTINGS_ICON = require("../../../assets/settings.png")

// DEBUG: force-show the "new" badge regardless of its normal display conditions. Set back to false before shipping.
const DEBUG_FORCE_NEW_BADGE = false

interface HeaderAction {
  id: string
  title?: string
  systemImage?: SFSymbol
  tintColor?: ColorValue
  accessibilityLabel?: string
  onPress: () => void
}

interface PlannerScreenHeaderProps {
  variant: "screen" | "sidebar"
}

export function PlannerScreenHeader({ variant }: PlannerScreenHeaderProps) {
  const { origin, destination } = useRoutePlanStore(useShallow((s) => ({ origin: s.origin, destination: s.destination })))
  const {
    route: rideRoute,
    canRunLiveActivities,
    originId: rideOriginId,
    destinationId: rideDestinationId,
    rideCount,
  } = useRideStore(
    useShallow((s) => ({
      route: s.route,
      canRunLiveActivities: s.canRunLiveActivities,
      originId: s.originId,
      destinationId: s.destinationId,
      rideCount: s.rideCount,
    })),
  )
  const seenUrgentMessagesIds = useSettingsStore((s) => s.seenUrgentMessagesIds)
  const router = useRouter()
  const { theme } = useUnistyles()
  const voucher = useUpcomingVoucherAction()
  const [displayNewBadge, setDisplayNewBadge] = useState(false)

  const { data: popupMessages, isFetched: didFetchPopupMessages } = useQuery(
    ["announcements", "urgent"],
    () => railApi.getPopupMessages(userLocale),
    { enabled: !HIDE_RAIL_SERVICE_UPDATES },
  )

  // Filter unseen urgent messages from the popup messages
  const unseenUrgentMessages = popupMessages ? filterUnseenUrgentMessages(popupMessages, seenUrgentMessagesIds) : []
  const hasUnseenUrgentMessages = !isEmpty(unseenUrgentMessages)
  const showUrgentBar = !HIDE_RAIL_SERVICE_UPDATES && hasUnseenUrgentMessages

  // Unseen urgent messages suppress the "new" badge. That answer only arrives with the popup
  // messages response, so hold the badge back until the query settles — rendering it beforehand
  // shows it on every launch and then yanks it away the moment the response lands.
  // Once the user has started a live ride they already know the feature, so never show it again.
  const hasStartedRide = rideCount > 0 || !!rideRoute
  const showNewBadge =
    displayNewBadge && !hasStartedRide && (HIDE_RAIL_SERVICE_UPDATES || (didFetchPopupMessages && !hasUnseenUrgentMessages))

  useEffect(() => {
    // display the "new" badge if the user has stations selected (not the initial launch),
    // and they haven't seen the live announcement screen yet,
    // and the user can run live activities (iOS only)
    if (origin && destination) {
      if (Platform.OS === "android" || canRunLiveActivities) {
        storage.load("seenLiveAnnouncement").then((hasSeenLiveAnnouncementScreen) => {
          if (!hasSeenLiveAnnouncementScreen) setDisplayNewBadge(true)
        })
      }
    }
  }, [])

  useEffect(() => {
    storage.load("appInstallDate").then((installDate) => {
      if (!installDate) {
        storage.save("appInstallDate", new Date().toISOString())
      }
    })
  }, [])

  const openAnnouncements = () => {
    router.push("/announcements")
    trackEvent("announcements_icon_pressed")
  }

  const openSettings = () => {
    router.push("/settings")
    trackEvent("settings_icon_pressed")
  }

  const openActiveRide = () => {
    useNavigationParamsStore.getState().setRouteDetails({
      routeItem: rideRoute as any,
      originId: String(rideOriginId()),
      destinationId: String(rideDestinationId()),
    })
    router.push("/active-ride")
    trackEvent("open_live_ride_modal_pressed")
  }

  const openLiveAnnouncement = () => router.push("/live-announcement")

  const showNew = DEBUG_FORCE_NEW_BADGE || showNewBadge
  const urgentBar = showUrgentBar && !rideRoute && (
    <ImportantAnnouncementBar title={head(unseenUrgentMessages)?.messageBody ?? ""} />
  )

  if (Platform.OS === "ios") {
    const actions: HeaderAction[] = []
    if (rideRoute) {
      actions.push({
        id: "live-ride",
        title: translate("ride.live") ?? undefined,
        tintColor: theme.colors.success,
        onPress: openActiveRide,
      })
    }
    if (voucher) {
      actions.push({
        id: "voucher",
        title: voucher.departure,
        tintColor: theme.colors.voucherText,
        accessibilityLabel: voucher.accessibilityLabel,
        onPress: voucher.onPress,
      })
    }
    if (showNew) {
      actions.push({
        id: "new",
        title: translate("common.new") ?? undefined,
        systemImage: "sparkles",
        tintColor: theme.colors.primary,
        onPress: openLiveAnnouncement,
      })
    }
    if (!HIDE_RAIL_SERVICE_UPDATES) {
      actions.push({
        id: "announcements",
        systemImage: "megaphone",
        accessibilityLabel: translate("routes.updates") ?? undefined,
        onPress: openAnnouncements,
      })
    }
    actions.push({
      id: "settings",
      systemImage: "gearshape",
      tintColor: theme.colors.primary,
      accessibilityLabel: translate("settings.title") ?? undefined,
      onPress: openSettings,
    })

    return (
      <>
        {variant === "sidebar" ? (
          // The sidebar column isn't in a native stack, so its navigation bar is set natively
          <NavigationBarItems
            items={actions}
            onItemPress={({ nativeEvent }) => actions.find((action) => action.id === nativeEvent.id)?.onPress()}
          />
        ) : (
          <Stack.Toolbar placement="right">
            {actions.map((action) =>
              action.title && action.systemImage ? (
                // A bar button shows only its icon when it has a title too, so this is the planner's glass chip
                <Stack.Toolbar.View key={action.id} hidesSharedBackground>
                  <NewChip onPress={action.onPress} />
                </Stack.Toolbar.View>
              ) : (
                <Stack.Toolbar.Button
                  key={action.id}
                  icon={action.systemImage}
                  tintColor={action.tintColor}
                  hidesSharedBackground
                  accessibilityLabel={action.accessibilityLabel}
                  onPress={action.onPress}
                >
                  {action.title}
                </Stack.Toolbar.Button>
              ),
            )}
          </Stack.Toolbar>
        )}
        {urgentBar && <View style={styles.headerWrapper}>{urgentBar}</View>}
      </>
    )
  }

  return (
    <>
      <View style={styles.headerWrapper}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[2] }}>{urgentBar}</View>
        {rideRoute && (
          <Chip variant="success" style={{ marginStart: spacing[2] }} onPress={openActiveRide}>
            <Text style={{ color: "white", fontWeight: "500", marginVertical: spacing[1] }} tx="ride.live" />
          </Chip>
        )}
        <UpcomingVoucherChip />
        {showNew && <NewChip style={{ marginStart: spacing[2] }} onPress={openLiveAnnouncement} />}
        {!HIDE_RAIL_SERVICE_UPDATES && (
          <TouchableOpacity
            testID="open-announcements-button"
            onPress={openAnnouncements}
            activeOpacity={0.8}
            accessibilityLabel={translate("routes.updates")}
          >
            <Image source={UPDATES_ICON} style={[styles.headerIconImage]} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID="open-settings-button"
          onPress={openSettings}
          activeOpacity={0.8}
          accessibilityLabel={translate("settings.title")}
        >
          <Image source={SETTINGS_ICON} style={styles.headerIconImage} />
        </TouchableOpacity>
      </View>
    </>
  )
}

function NewChip({ style, onPress }: { style?: ViewStyle; onPress: () => void }) {
  return (
    <Chip variant="primary" style={style} onPress={onPress}>
      <Image source={SPARKLES_ICON} style={{ height: 16, width: 16, marginEnd: spacing[2], tintColor: "white" }} />
      <Text style={{ color: "white", fontWeight: "500", marginVertical: spacing[1] }} tx="common.new" />
    </Chip>
  )
}

const styles = StyleSheet.create((theme, rt) => {
  const headerIconSize = rt.fontScale > 1.15 ? 30 : 25

  return {
    headerWrapper: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      minHeight: 40,
      marginBottom: theme.spacing[2],
    },
    headerIconImage: {
      width: headerIconSize,
      height: headerIconSize,
      marginStart: theme.spacing[3],
      tintColor: theme.colors.primary,
      opacity: 0.7,
      transform: rt.rtl ? [{ rotateY: "180deg" }] : undefined,
    },
  }
})
