import { useQuery } from "react-query"
import { firestore } from "../../services/firebase/firestore"
import { toJS } from "mobx"
import { useStores } from "../../models"
import { userLocale } from "../../i18n"
import { uniq } from "lodash"

export interface ServiceUpdate {
  expireAt: Date
  title: string
  body: string
  link?: string
}

export function useServiceUpdates() {
  const { settings, favoriteRoutes } = useStores()

  return useQuery("serviceUpdates", async () => {
    let data: ServiceUpdate[] = []

    // Get all the station that the user has notifications enabled for, including their favorite routes
    const favoriteStations = favoriteRoutes.routes.flatMap((route) => [route.originId, route.destinationId])
    const notificationsStations = uniq([...toJS(settings.stationsNotifications), ...favoriteStations])

    const querySnapshot = await firestore
      .collection("service-updates")
      .where("expiresAt", ">", new Date())
      .where("stations", "array-contains-any", [...notificationsStations, "all-stations"])
      .get()

    querySnapshot.forEach((doc) => {
      const documentData = doc.data()
      data.push({ ...documentData[userLocale], link: documentData.url } as ServiceUpdate)
    })

    return data
  })
}

export default useServiceUpdates
