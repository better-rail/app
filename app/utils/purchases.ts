import { Platform } from "react-native"
import Purchases, { LOG_LEVEL } from "react-native-purchases"

export const configurePurchases = async () => {
  Purchases.setLogLevel(LOG_LEVEL.DEBUG)

  if (Platform.OS === "ios") {
    await Purchases.configure({ apiKey: "appl_pOArhScpRECBNsNeIwfRCkYlsfZ" })
  } else if (Platform.OS === "android") {
    // await Purchases.configure({ apiKey: <public_google_api_key> });
  }
}

export const getProducts = async () => {
  try {
    const offerings = await Purchases.getOfferings()
    return offerings.current?.availablePackages ?? []
  } catch (error) {
    console.error(error)
    return []
  }
}
