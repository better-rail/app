import HapticFeedback from "react-native-haptic-feedback"
import * as Burnt from "burnt"
import { translate } from "@/i18n"
import { shareRouteAction } from "@/utils/helpers/route-share-helpers"
import { addRouteToCalendar } from "@/utils/helpers/calendar-helpers"
import type { RouteItem } from "@/services/api"
import type { ContextMenuAction } from "@/components/context-menu/context-menu"
import { openDelayGuardSheet } from "@/utils/helpers/delay-guard-helpers"

export const createContextMenuActions = (routeItem: RouteItem, originId: string, destinationId: string): ContextMenuAction[] => [
  {
    title: translate("routeDetails.addToCalendar"),
    systemIcon: "calendar.badge.plus",
    onPress: async () => {
      HapticFeedback.trigger("impactMedium")
      try {
        const wasAdded = await addRouteToCalendar(routeItem)
        if (wasAdded) {
          Burnt.alert({
            title: translate("routes.addedToCalendar"),
            preset: "done",
            message: translate("routes.addedToCalendar"),
          })
        }
      } catch (error) {
        console.error("Failed to add to calendar:", error)
        Burnt.alert({
          title: translate("common.error"),
          preset: "error",
          message: "Failed to add to calendar",
        })
      }
    },
  },
  {
    title: translate("routes.share"),
    systemIcon: "square.and.arrow.up",
    onPress: () => shareRouteAction(routeItem, originId, destinationId),
  },
  {
    title: translate("delayGuard.title") ?? "",
    systemIcon: "bell.badge",
    onPress: () => openDelayGuardSheet(routeItem, "route_list"),
  },
]
