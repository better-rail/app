import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { Platform } from "react-native"
import RevenueCat, { LOG_LEVEL, PurchasesOffering, PurchasesPackage } from "react-native-purchases"

export const PurchasesModel = types
  .model("Purchases")
  .views(() => ({
    get isPro(): Promise<boolean> {
      return RevenueCat.getCustomerInfo()
        .then((info) => {
          return info.entitlements.active["better-rail-pro"]?.isActive
        })
        .catch(() => false)
    },
    get offerings(): Promise<PurchasesPackage[]> {
      return RevenueCat.getOfferings()
        .then((offerings) => offerings.current.availablePackages)
        .catch(() => [])
    },
  }))
  .actions(() => ({
    async afterCreate() {
      RevenueCat.setLogLevel(LOG_LEVEL.DEBUG)

      if (Platform.OS === "ios") {
        await RevenueCat.configure({ apiKey: "appl_pOArhScpRECBNsNeIwfRCkYlsfZ" })
      } else if (Platform.OS === "android") {
        // await Purchases.configure({ apiKey: <public_google_api_key> });
      }
    },
    purchaseOffering(offering: keyof PurchasesOffering) {
      return RevenueCat.getOfferings()
        .then((offerings) => offerings.current[offering] as PurchasesPackage)
        .then((selectedPackage) => RevenueCat.purchasePackage(selectedPackage))
    },
    purchaseMonthly() {
      return this.purchaseOffering("monthly")
    },
    purchaseAnnual() {
      return this.purchaseOffering("annual")
    },
    restorePurchases() {
      return RevenueCat.restorePurchases()
    },
  }))

type PurchasesType = Instance<typeof PurchasesModel>
export interface Purchases extends PurchasesType {}
type PurchasesSnapshotType = SnapshotOut<typeof PurchasesModel>
export interface PurchasesSnapshot extends PurchasesSnapshotType {}
export const createPurchasesDefaultModel = () => types.optional(PurchasesModel, {})
