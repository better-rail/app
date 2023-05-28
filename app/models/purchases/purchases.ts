import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { AppState, Platform } from "react-native"
import RevenueCat, { LOG_LEVEL, PurchasesOffering, PurchasesPackage, CustomerInfo } from "react-native-purchases"
import auth from "@react-native-firebase/auth"
import {
  getIsWatchAppInstalled,
  updateApplicationContext,
  WatchPayload,
  getApplicationContext,
} from "react-native-watch-connectivity"
import UserDefaults from "@alevy97/react-native-userdefaults"

const checkIsPro = (customerInfo: CustomerInfo) => {
  return !!customerInfo.entitlements.active["better-rail-pro"]
}

let isWatchAppInstalled = false
let userDefaults = Platform.OS === "ios" && new UserDefaults("group.il.co.better-rail")

export const PurchasesModel = types
  .model("Purchases")
  .props({
    isPro: types.maybe(types.boolean),
  })
  .views(() => ({
    get customerInfo() {
      return RevenueCat.getCustomerInfo()
    },
    get offerings() {
      return RevenueCat.getOfferings().then((offerings) => offerings.current.availablePackages)
    },
  }))
  .actions((self) => ({
    setIsPro(isPro: boolean) {
      self.isPro = isPro
      userDefaults?.set("isPro", isPro)
      if (isWatchAppInstalled) this.updateAppleWatchProStatus()
    },
    async afterCreate() {
      RevenueCat.setLogLevel(LOG_LEVEL.DEBUG)

      if (Platform.OS === "ios") {
        await RevenueCat.configure({
          apiKey: "appl_pOArhScpRECBNsNeIwfRCkYlsfZ",
          appUserID: auth().currentUser?.uid,
          userDefaultsSuiteName: "group.il.co.better-rail",
        })
      } else if (Platform.OS === "android") {
        // await Purchases.configure({ apiKey: <public_google_api_key> });
      }

      const customerInfo = await self.customerInfo
      this.setIsPro(checkIsPro(customerInfo))

      if (Platform.OS === "ios") {
        getIsWatchAppInstalled().then((isInstalled) => {
          if (isInstalled) {
            this.updateAppleWatchProStatus()
            isWatchAppInstalled = true
          }
        })
      }

      AppState.addEventListener("change", async (currentState) => {
        if (currentState === "active") {
          const customerInfo = await self.customerInfo
          this.setIsPro(checkIsPro(customerInfo))
        }
      })
    },
    async updateAppleWatchProStatus() {
      const appContext: WatchPayload = (await getApplicationContext()) ?? {}
      appContext["isPro"] = self.isPro
      updateApplicationContext(appContext)
    },
    purchaseOffering(offering: keyof PurchasesOffering) {
      return RevenueCat.getOfferings()
        .then((offerings) => offerings.current[offering] as PurchasesPackage)
        .then((selectedPackage) => RevenueCat.purchasePackage(selectedPackage))
        .then((result) => {
          this.setIsPro(checkIsPro(result.customerInfo))
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
        this.setIsPro(checkIsPro(customerInfo))
        return customerInfo
      })
    },
  }))

type PurchasesType = Instance<typeof PurchasesModel>
export interface Purchases extends PurchasesType {}
type PurchasesSnapshotType = SnapshotOut<typeof PurchasesModel>
export interface PurchasesSnapshot extends PurchasesSnapshotType {}
export const createPurchasesDefaultModel = () => types.optional(PurchasesModel, {})
