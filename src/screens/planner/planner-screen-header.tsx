import { useEffect, useState } from "react"
import { Image, Platform, TouchableOpacity, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import * as storage from "@/utils/storage"
import { trackEvent } from "@/services/analytics"
import { spacing } from "@/theme"
import { Chip, Text } from "@/components"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useRideStore, useSettingsStore, filterUnseenUrgentMessages } from "@/models"
import { translate, userLocale } from "@/i18n"
import { ImportantAnnouncementBar } from "./Important-announcement-bar"
import { railApi } from "@/services/api"
import { useQuery } from "react-query"
import { head, isEmpty } from "lodash"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"

const TRAIN_ICON = require("../../../assets/train.ios.png")
const SPARKLES_ICON = require("../../../assets/sparkles.png")
const UPDATES_ICON = require("../../../assets/updates.png")
const SETTINGS_ICON = require("../../../assets/settings.png")
const SHOW_NEW_BADGE = false

export function PlannerScreenHeader() {
  const { origin, destination } = useRoutePlanStore(useShallow((s) => ({ origin: s.origin, destination: s.destination })))
  const {
    route: rideRoute,
    canRunLiveActivities,
    originId: rideOriginId,
    destinationId: rideDestinationId,
  } = useRideStore(
    useShallow((s) => ({
      route: s.route,
      canRunLiveActivities: s.canRunLiveActivities,
      originId: s.originId,
      destinationId: s.destinationId,
    })),
  )
  const seenUrgentMessagesIds = useSettingsStore((s) => s.seenUrgentMessagesIds)
  const router = useRouter()
  const [displayNewBadge, setDisplayNewBadge] = useState(false)

  const { data: popupMessages } = useQuery(["announcements", "urgent"], () => {
    return railApi.getPopupMessages(userLocale)
  })

  // Filter unseen urgent messages from the popup messages
  const unseenUrgentMessages = popupMessages ? filterUnseenUrgentMessages(popupMessages, seenUrgentMessagesIds) : []
  const showUrgentBar = !isEmpty(unseenUrgentMessages)

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

  return (
    <>
      <View style={styles.headerWrapper}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
          {showUrgentBar && !rideRoute && <ImportantAnnouncementBar title={head(unseenUrgentMessages)?.messageBody ?? ""} />}

          {rideRoute && (
            <Chip
              variant="success"
              onPress={() => {
                useNavigationParamsStore.getState().setRouteDetails({
                  routeItem: rideRoute as any,
                  originId: String(rideOriginId()),
                  destinationId: String(rideDestinationId()),
                })
                router.push("/active-ride")
                trackEvent("open_live_ride_modal_pressed")
              }}
            >
              {Platform.OS === "ios" && <Image source={TRAIN_ICON} style={styles.liveButtonImage} />}
              <Text style={{ color: "white", fontWeight: "500", marginVertical: spacing[1] }} tx="ride.live" />
            </Chip>
          )}
        </View>
        {SHOW_NEW_BADGE && displayNewBadge && !showUrgentBar && (
          <Chip variant="primary" style={{ marginStart: spacing[2] }} onPress={() => router.push("/live-announcement")}>
            <Image source={SPARKLES_ICON} style={{ height: 16, width: 16, marginEnd: spacing[2], tintColor: "white" }} />
            <Text style={{ color: "white", fontWeight: "500", marginVertical: spacing[1] }} tx="common.new" />
          </Chip>
        )}
        <TouchableOpacity onPress={openAnnouncements} activeOpacity={0.8} accessibilityLabel={translate("routes.updates")}>
          <Image source={UPDATES_ICON} style={[styles.headerIconImage]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openSettings} activeOpacity={0.8} accessibilityLabel={translate("settings.title")}>
          <Image source={SETTINGS_ICON} style={styles.headerIconImage} />
        </TouchableOpacity>
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
    liveButtonImage: {
      width: 22.5,
      height: 14,
      marginEnd: rt.rtl ? theme.spacing[1] : theme.spacing[2],
      tintColor: "white",
      transform: rt.rtl ? [{ rotateY: "220deg" }] : undefined,
    },
  }
})
