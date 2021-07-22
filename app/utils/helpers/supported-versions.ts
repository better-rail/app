import { Platform } from "react-native"

/**
 * Whether the device is Android with a version older than 25
 *
 * Those has issues with the bottom sheet component
 */
export const isOldAndroid = Platform.OS === "android" && Platform.Version < 26
