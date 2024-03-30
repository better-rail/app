import { useQuery } from "react-query"
import firestore from "@react-native-firebase/firestore"
import { toJS } from "mobx"
import { useStores } from "../../models"
import { userLocale } from "../../i18n"

export interface ServiceUpdate {
  expireAt: Date
  title: string
  body: string
}

export function useServiceUpdates() {
  const { settings } = useStores()

  return useQuery("serviceUpdates", async () => {
    let data: ServiceUpdate[] = []

    const querySnapshot = await firestore()
      .collection("service-updates")
      .where("expiresAt", ">", new Date())
      .where("stations", "array-contains-any", [...toJS(settings.stationsNotifications), "all-stations"])
      .get()

    querySnapshot.forEach((doc) => {
      data.push(doc.data()[userLocale] as ServiceUpdate)
    })

    return data
  })
}

export default useServiceUpdates
