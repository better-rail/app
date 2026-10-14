import * as Notifications from "expo-notifications"
import { DeviceEventEmitter, NativeModules, Platform } from "react-native"
import { clearBackgroundStorage, getRideRoute, getUserLocale, setRideRoute } from "@/utils/storage/background-storage"
import { LiveRideController } from "./live-ride-controller"
import type { AndroidAlert, LiveRideNativeBridge, LiveRideUpdatePayload } from "./types"

export const addStopRideListener = (callback: () => void) => {
  const subscription = DeviceEventEmitter.addListener("onLiveRideStopRequested", callback)
  return () => subscription.remove()
}

export { extractFcmData } from "./fcm-payload"
export { LiveRideController, STALE_AFTER_MS } from "./live-ride-controller"
export * from "./types"

export const isLiveRideSupported = (): boolean =>
  Platform.OS === "android" && Boolean(NativeModules.LiveRideNotificationModule)

class AndroidNativeBridge implements LiveRideNativeBridge {
  private get nativeModule() {
    return isLiveRideSupported() ? NativeModules.LiveRideNotificationModule : undefined
  }

  async updateLiveRide(payload: LiveRideUpdatePayload): Promise<boolean> {
    return this.nativeModule?.updateLiveRide(payload) ?? true
  }

  async cancelLiveRide(): Promise<boolean> {
    return this.nativeModule?.cancelLiveRide() ?? true
  }

  async canPostPromoted(): Promise<boolean> {
    return this.nativeModule?.canPostPromoted() ?? false
  }

  async canScheduleExactAlarms(): Promise<boolean> {
    return this.nativeModule?.canScheduleExactAlarms() ?? false
  }

  async postAlert(alert: AndroidAlert): Promise<boolean> {
    return this.nativeModule?.postAlert(alert) ?? true
  }
}

const bridge = new AndroidNativeBridge()

export const liveRideNotifications = new LiveRideController({
  bridge,
  storage: {
    getRoute: async () => (await getRideRoute()) || null,
    saveRoute: setRideRoute,
    clear: clearBackgroundStorage,
  },
  getNotificationsGranted: async () => (await Notifications.getPermissionsAsync()).granted,
  getUserLanguage: async () => (await getUserLocale()) || null,
})

export const postAndroidAlert = (alert: AndroidAlert) => liveRideNotifications.postAlert(alert)
