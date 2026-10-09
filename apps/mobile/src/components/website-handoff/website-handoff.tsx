import { useCallback, useId } from "react"
import { useFocusEffect } from "expo-router"
import { isRTL, userLocale } from "@/i18n"
import { stationLocale, stationsObject } from "@/data/stations"
import { websiteRouteURL } from "@/utils/helpers/web-links"
import { websiteHandoff } from "@/utils/website-handoff"

interface WebsiteHandoffProps {
  originId: string
  destinationId: string
  time: number
  trainNumbers?: Array<string | number>
}

export function WebsiteHandoff({ originId, destinationId, time, trainNumbers }: WebsiteHandoffProps) {
  const id = useId()
  const url = websiteRouteURL({ originId, destinationId, time, trainNumbers, locale: userLocale })
  const arrow = isRTL ? "←" : "→"
  const title = `${stationsObject[originId]?.[stationLocale] ?? ""} ${arrow} ${stationsObject[destinationId]?.[stationLocale] ?? ""}`

  const validRoute =
    !!stationsObject[originId] && !!stationsObject[destinationId] && originId !== destinationId && Number.isFinite(time)

  useFocusEffect(
    useCallback(() => {
      const activityModule = websiteHandoff
      if (!activityModule || !validRoute) return
      // Head's internal screen href cannot restore a journey on another device.
      activityModule.createActivity({
        id,
        activityType: activityModule.activities.INDEXED_ROUTE,
        title,
        webpageURL: url,
        userInfo: { href: url },
        isEligibleForHandoff: true,
        isEligibleForSearch: false,
      })
      return () => activityModule.revokeActivity(id)
    }, [id, title, url, validRoute]),
  )

  return null
}
