import { useEffect, useState } from "react"
import DeviceInfo from "react-native-device-info"

export function useIsBetaTester() {
  const [isBetaTester, setIsBetaTester] = useState(false)

  useEffect(() => {
    DeviceInfo.getInstallerPackageName().then((value) => {
      if (value == "TestFlight") {
        setIsBetaTester(true)
      }
    })
  }, [])

  return isBetaTester
}
