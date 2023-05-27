import { Instance, SnapshotOut, types } from "mobx-state-tree"
import auth from "@react-native-firebase/auth"
import RevenueCat from "react-native-purchases"
import { Platform } from "react-native"
import UserDefaults from "@alevy97/react-native-userdefaults"

let userDefaults: UserDefaults
if (Platform.OS === "ios") {
  userDefaults = new UserDefaults("group.il.co.better-rail")
}

userDefaults.get("userId").then(console.log)

export const UserModel = types
  .model("User")
  .props({
    currentUserId: types.maybe(types.string),
    disableTelemetry: types.maybe(types.boolean),
  })
  .views((self) => ({
    get currentUser() {
      return auth().currentUser
    },
  }))
  .actions((self) => ({
    setCurrentUserId(uid?: string) {
      self.currentUserId = uid

      if (uid) {
        userDefaults?.set("userId", uid)
      } else {
        userDefaults?.remove("userId")
      }
    },
    async afterCreate() {
      if (!self.currentUser) {
        auth().signInAnonymously()
      }

      auth().onAuthStateChanged(async (user) => {
        this.setCurrentUserId(user?.uid)

        if (await RevenueCat.isConfigured()) {
          if (user) {
            RevenueCat.logIn(user?.uid)
          } else {
            RevenueCat.logOut()
          }
        }
      })
    },

    setDisableTelemetry(value: boolean) {
      self.disableTelemetry = value
    },
  }))

type UserType = Instance<typeof UserModel>
export interface User extends UserType {}
type UserSnapshotType = SnapshotOut<typeof UserModel>
export interface UserSnapshot extends UserSnapshotType {}
export const createUserDefaultModel = () => types.optional(UserModel, {})
