import { useEffect, useState } from "react"
import DeviceInfo from "react-native-device-info"

export function useIsBetaTester() {
  const [isBetaTester, setIsBetaTester] = useState(false)

  useEffect(() => {
    DeviceInfo.getInstallerPackageName().then((value) => {
      setIsBetaTester(value == "TestFlight")
    })
  }, [])

  return isBetaTester
}
