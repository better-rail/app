import { useEffect, useState } from "react"
import { Image, Platform, TouchableOpacity, View, useColorScheme, type ColorValue } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter, Stack, type NativeStackHeaderItem } from "expo-router"
import type { HeaderBarButtonItem } from "react-native-screens"
import * as storage from "@/utils/storage"
import { trackEvent } from "@/services/analytics"
import { color, spacing } from "@/theme"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { useSafeAreaInsets } from "react-native-safe-area-context"
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
import { UpcomingVoucherChip } from "./upcoming-voucher-chip"
import { useSplitViewStore } from "@/components/split-view/split-view-store"

const TRAIN_ICON = require("../../../assets/train.ios.png")
const SPARKLES_ICON = require("../../../assets/sparkles.png")
const UPDATES_ICON = require("../../../assets/updates.png")
const SETTINGS_ICON = require("../../../assets/settings.png")

/**
 * The planner's actions are native bar items, which the system lays out where the bar goes: a row under the status
 * bar, or iPhone Duo's side bar. They stay native beside the favorites too, so as the Duo folds the system carries them
 * between the column's top and the side bar in the same pass, instead of the app swapping in its own row a few frames
 * after the new layout is on screen.
 */
export function usePlannerNativeToolbar() {
  return Platform.OS === "ios" && isLiquidGlassSupported
}

// DEBUG: force-show the "new" badge regardless of its normal display conditions. Set back to false before shipping.
const DEBUG_FORCE_NEW_BADGE = false

type SFSymbol = Extract<NonNullable<Extract<NativeStackHeaderItem, { type: "button" }>["icon"]>, { type: "sfSymbol" }>["name"]

type PlannerAction = {
  id: string
  label: string
  symbol: SFSymbol
  tintColor: ColorValue
  prominent?: boolean
  onPress: () => void
}

/**
 * The planner's actions and the state behind them: the ride in progress, the "new" badge and the urgent notice that
 * holds it back. Shared by the planner's bar and, beside the favorites, the split view's second column (see SidePane).
 */
export function usePlannerActions() {
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
  const [displayNewBadge, setDisplayNewBadge] = useState(false)

  const { data: popupMessages, isFetched: didFetchPopupMessages } = useQuery(
    ["announcements", "urgent"],
    () => railApi.getPopupMessages(userLocale),
    { enabled: !HIDE_RAIL_SERVICE_UPDATES },
  )

  // Filter unseen urgent messages from the popup messages
  const unseenUrgentMessages = popupMessages ? filterUnseenUrgentMessages(popupMessages, seenUrgentMessagesIds) : []
  const hasUnseenUrgentMessages = !isEmpty(unseenUrgentMessages)

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

  const showNewChip = DEBUG_FORCE_NEW_BADGE || showNewBadge

  // In the bar's order: ride status, the "new" badge, updates, settings.
  const actions: PlannerAction[] = []
  if (rideRoute) {
    const label = translate("ride.live") ?? ""
    actions.push({ id: "live", label, symbol: "tram.fill", tintColor: color.success, prominent: true, onPress: openActiveRide })
  }
  if (showNewChip) {
    const label = translate("common.new") ?? ""
    actions.push({
      id: "new",
      label,
      symbol: "sparkles",
      tintColor: color.primary,
      prominent: true,
      onPress: openLiveAnnouncement,
    })
  }
  if (!HIDE_RAIL_SERVICE_UPDATES) {
    const label = translate("routes.updates") ?? ""
    actions.push({ id: "updates", label, symbol: "newspaper", tintColor: color.primary, onPress: openAnnouncements })
  }
  actions.push({
    id: "settings",
    label: translate("settings.title") ?? "",
    symbol: "gearshape",
    tintColor: color.primary,
    onPress: openSettings,
  })

  return {
    actions,
    rideRoute,
    showNewChip,
    urgentMessage: hasUnseenUrgentMessages && !HIDE_RAIL_SERVICE_UPDATES ? head(unseenUrgentMessages) : undefined,
    openActiveRide,
    openAnnouncements,
    openSettings,
    openLiveAnnouncement,
  }
}

/** The planner's actions as the split view's second column bar items, which iPhone Duo lays out in its side bar. */
export function usePlannerBarButtonItems(): HeaderBarButtonItem[] {
  const { actions } = usePlannerActions()
  return actions.map((action) => ({
    type: "button",
    identifier: `planner.${action.id}`,
    title: action.label,
    icon: { type: "sfSymbol", name: action.symbol },
    variant: action.prominent ? "prominent" : undefined,
    tintColor: action.tintColor,
    onPress: action.onPress,
  }))
}

export function PlannerScreenHeader() {
  const {
    actions,
    rideRoute,
    showNewChip,
    urgentMessage,
    openActiveRide,
    openAnnouncements,
    openSettings,
    openLiveAnnouncement,
  } = usePlannerActions()

  useEffect(() => {
    storage.load("appInstallDate").then((installDate) => {
      if (!installDate) {
        storage.save("appInstallDate", new Date().toISOString())
      }
    })
  }, [])

  const useNativeToolbar = usePlannerNativeToolbar()
  // With the bar's items, the screen's own safe area tells where the content starts: below the bar's row, or the top
  // when the bar sits on the side. The planner screen leaves its top unpadded for this.
  const insets = useSafeAreaInsets()
  // Expanded, the bar is left empty (its items are beside the favorites), so the content starts at the top instead.
  const isSplitExpanded = useSplitViewStore((s) => !s.isCollapsed)
  // The stack's theme is dark for the photo headers; the planner's bar follows the system instead.
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light"

  // Beside the favorites the split view's second column holds these instead, so iPhone Duo's side bar keeps them
  // open or closed. The split view hides them here as it expands, in the same pass (see the react-native-screens patch).
  const nativeHeaderItems = (): NativeStackHeaderItem[] =>
    actions.map((action) => ({
      type: "button",
      identifier: `collapsed-split-only.planner.${action.id}`,
      label: action.label,
      icon: { type: "sfSymbol", name: action.symbol },
      variant: action.prominent ? "prominent" : undefined,
      tintColor: action.tintColor,
      onPress: action.onPress,
    }))

  return (
    <>
      <Stack.Screen
        options={
          useNativeToolbar
            ? {
                headerShown: true,
                headerTransparent: true,
                headerTitle: "",
                headerUserInterfaceStyle: colorScheme,
                unstable_headerRightItems: nativeHeaderItems,
              }
            : { headerShown: false }
        }
      />
      <View
        style={
          useNativeToolbar
            ? [styles.barHeaderWrapper, isSplitExpanded ? styles.expandedSplitTop : { paddingTop: insets.top }]
            : styles.headerWrapper
        }
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
          {urgentMessage && !rideRoute && <ImportantAnnouncementBar title={urgentMessage.messageBody ?? ""} />}
        </View>
        {!useNativeToolbar && rideRoute && (
          <Chip variant="success" style={{ marginStart: spacing[2] }} onPress={openActiveRide}>
            {Platform.OS === "ios" && <Image source={TRAIN_ICON} style={styles.liveButtonImage} />}
            <Text style={{ color: "white", fontWeight: "500", marginVertical: spacing[1] }} tx="ride.live" />
          </Chip>
        )}
        <UpcomingVoucherChip />
        {!useNativeToolbar && showNewChip && (
          <Chip variant="primary" style={{ marginStart: spacing[2] }} onPress={openLiveAnnouncement}>
            <Image source={SPARKLES_ICON} style={{ height: 16, width: 16, marginEnd: spacing[2], tintColor: "white" }} />
            <Text style={{ color: "white", fontWeight: "500", marginVertical: spacing[1] }} tx="common.new" />
          </Chip>
        )}
        {!useNativeToolbar && !HIDE_RAIL_SERVICE_UPDATES && (
          <TouchableOpacity
            testID="open-announcements-button"
            onPress={openAnnouncements}
            activeOpacity={0.8}
            accessibilityLabel={translate("routes.updates")}
          >
            <Image source={UPDATES_ICON} style={[styles.headerIconImage]} />
          </TouchableOpacity>
        )}
        {!useNativeToolbar && (
          <TouchableOpacity
            testID="open-settings-button"
            onPress={openSettings}
            activeOpacity={0.8}
            accessibilityLabel={translate("settings.title")}
          >
            <Image source={SETTINGS_ICON} style={styles.headerIconImage} />
          </TouchableOpacity>
        )}
      </View>
    </>
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
      // iPhone Duo keeps its status bar on the side, so nothing else holds the row off the top edge.
      marginTop: rt.insets.top > 0 ? 0 : theme.spacing[2],
      marginBottom: theme.spacing[2],
    },
    // Only what's left in the row (an urgent notice, the voucher chip) takes room once the actions are bar items.
    barHeaderWrapper: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      marginBottom: theme.spacing[2],
    },
    expandedSplitTop: {
      paddingTop: rt.insets.top + theme.spacing[5],
    },
    headerIconImage: {
      width: headerIconSize,
      height: headerIconSize,
      marginStart: theme.spacing[3],
      tintColor: theme.colors.primary,
      opacity: 0.7,
      transform: rt.rtl ? [{ rotateY: "180deg" }] : undefined,
    },
    liveButtonImage: {
      width: 22.5,
      height: 14,
      marginEnd: rt.rtl ? theme.spacing[1] : theme.spacing[2],
      tintColor: "white",
      transform: rt.rtl ? [{ rotateY: "220deg" }] : undefined,
    },
  }
})
