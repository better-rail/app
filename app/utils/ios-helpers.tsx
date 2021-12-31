import { NativeModules } from "react-native"

const { RNBetterRail } = NativeModules

export function donateRouteIntent(originId: string, destinationId: string) {
  RNBetterRail.donateRouteIntent(originId, destinationId)
}

export function reloadAllTimelines() {
  RNBetterRail.reloadAllTimelines()
}
