import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { Platform } from "react-native"
import RevenueCat, { LOG_LEVEL, PurchasesOffering, PurchasesPackage, CustomerInfo } from "react-native-purchases"
import auth from "@react-native-firebase/auth"

const checkIsPro = (customerInfo: CustomerInfo) => {
  return customerInfo.entitlements.active["better-rail-pro"]?.isActive
}

export const PurchasesModel = types
  .model("Purchases")
  .props({
    isPro: types.boolean,
  })
  .views(() => ({
    get offerings(): Promise<PurchasesPackage[]> {
      return RevenueCat.getOfferings()
        .then((offerings) => offerings.current.availablePackages)
        .catch(() => [])
    },
  }))
  .actions((self) => ({
    async afterCreate() {
      RevenueCat.setLogLevel(LOG_LEVEL.DEBUG)

      if (Platform.OS === "ios") {
        await RevenueCat.configure({ apiKey: "appl_pOArhScpRECBNsNeIwfRCkYlsfZ", appUserID: auth().currentUser?.uid })
      } else if (Platform.OS === "android") {
        // await Purchases.configure({ apiKey: <public_google_api_key> });
      }

      const customerInfo = await RevenueCat.getCustomerInfo()
      self.isPro = checkIsPro(customerInfo)
    },
    purchaseOffering(offering: keyof PurchasesOffering) {
      return RevenueCat.getOfferings()
        .then((offerings) => offerings.current[offering] as PurchasesPackage)
        .then((selectedPackage) => RevenueCat.purchasePackage(selectedPackage))
        .then((result) => {
          self.isPro = checkIsPro(result.customerInfo)
          return result
        })
    },
    purchaseMonthly() {
      return this.purchaseOffering("monthly")
    },
    purchaseAnnual() {
      return this.purchaseOffering("annual")
    },
    restorePurchases() {
      return RevenueCat.restorePurchases().then((customerInfo) => {
        self.isPro = checkIsPro(customerInfo)
        return customerInfo
      })
    },
  }))

type PurchasesType = Instance<typeof PurchasesModel>
export interface Purchases extends PurchasesType {}
type PurchasesSnapshotType = SnapshotOut<typeof PurchasesModel>
export interface PurchasesSnapshot extends PurchasesSnapshotType {}
export const createPurchasesDefaultModel = () => types.optional(PurchasesModel, {})
