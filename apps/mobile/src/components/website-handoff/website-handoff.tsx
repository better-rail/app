import Head from "expo-router/head"
import { isRTL, userLocale } from "@/i18n"
import { stationLocale, stationsObject } from "@/data/stations"
import { websiteRouteURL } from "@/utils/helpers/web-links"

interface WebsiteHandoffProps {
  originId: string
  destinationId: string
  time: number
  trainNumbers?: Array<string | number>
}

/**
 * Offers the routes on screen to Safari on the user's other Apple devices (Handoff), as the matching
 * better-rail.co.il page. Only while the screen is focused; a no-op off iOS.
 */
export function WebsiteHandoff({ originId, destinationId, time, trainNumbers }: WebsiteHandoffProps) {
  const url = websiteRouteURL({ originId, destinationId, time, trainNumbers, locale: userLocale })
  const arrow = isRTL ? "←" : "→"
  const title = `${stationsObject[originId]?.[stationLocale] ?? ""} ${arrow} ${stationsObject[destinationId]?.[stationLocale] ?? ""}`

  return (
    <Head>
      <title>{title}</title>
      <meta property="og:url" content={url} />
      <meta property="expo:handoff" content="true" />
      <meta property="expo:spotlight" content="false" />
    </Head>
  )
}
