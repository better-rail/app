import { Linking, Platform } from "react-native"

/** Opens the platform's maps app on a place: Apple Maps on iOS, whatever handles `geo:` on Android. */
export const openInMaps = (lat: number, lon: number, name: string) => {
  const label = encodeURIComponent(name)
  const url = Platform.select({
    ios: `maps://?q=${label}&ll=${lat},${lon}`,
    default: `geo:${lat},${lon}?q=${lat},${lon}(${label})`,
  })
  return Linking.openURL(url).catch(() => Linking.openURL(`https://maps.apple.com/?q=${label}&ll=${lat},${lon}`))
}
