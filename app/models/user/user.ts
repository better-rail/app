import { Instance, SnapshotOut, types } from "mobx-state-tree"
import auth from "@react-native-firebase/auth"
import RevenueCat from "react-native-purchases"

export const UserModel = types
  .model("User")
  .props({
    currentUserId: types.maybe(types.string),
  })
  .views((self) => ({
    get currentUser() {
      return auth().currentUser
    },
  }))
  .actions((self) => ({
    setCurrentUserId(uid?: string) {
      self.currentUserId = uid
    },
    async afterCreate() {
      if (!self.currentUser) {
        auth().signInAnonymously()
      }

      auth().onAuthStateChanged((user) => {
        this.setCurrentUserId(user?.uid)
        if (user) {
          RevenueCat.logIn(user?.uid)
        } else {
          RevenueCat.logOut()
        }
      })
    },
  }))

type UserType = Instance<typeof UserModel>
export interface User extends UserType {}
type UserSnapshotType = SnapshotOut<typeof UserModel>
export interface UserSnapshot extends UserSnapshotType {}
export const createUserDefaultModel = () => types.optional(UserModel, {})
