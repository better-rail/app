import { useQuery } from "react-query"
import { firestore } from "../../services/firebase/firestore"
import { toJS } from "mobx"
import { useStores } from "../../models"
import { userLocale } from "../../i18n"
import { uniq } from "lodash"
import { collection, getDocs, query, where } from "@react-native-firebase/firestore"

export interface ServiceUpdate {
  expireAt: Date
  title: string
  body: string
  link?: string
}

export function useServiceUpdates() {
  const { settings, favoriteRoutes } = useStores()

  return useQuery("serviceUpdates", async () => {
    const data: ServiceUpdate[] = []

    // Get all the station that the user has notifications enabled for, including their favorite routes
    const favoriteStations = favoriteRoutes.routes.flatMap((route) => [route.originId, route.destinationId])
    const notificationsStations = uniq([...toJS(settings.stationsNotifications), ...favoriteStations])

    const q = query(
      collection(firestore, "service-updates"),
      where("expiresAt", ">", new Date()),
      where("stations", "array-contains-any", [...notificationsStations, "all-stations"]),
    )

    const querySnapshot = await getDocs(q)

    // biome-ignore lint/complexity/noForEach: firebase standard (per docs)
    querySnapshot.forEach((doc) => {
      const documentData = doc.data()
      data.push({ ...documentData[userLocale], link: documentData.url } as ServiceUpdate)
    })

    return data
  })
}

export default useServiceUpdates
