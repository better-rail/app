import { useState, useEffect } from "react"
import NitroNetworkInfo from "react-native-nitro-network-info"

interface NetworkInfo {
  isConnected: boolean | null
}

export function useNetworkInfo(): NetworkInfo {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isConnected: NitroNetworkInfo.isConnected,
  })

  useEffect(() => {
    const unsubscribe = NitroNetworkInfo.addListener((info) => {
      setNetworkInfo({ isConnected: info.isConnected })
    })

    return () => unsubscribe()
  }, [])

  return networkInfo
}
