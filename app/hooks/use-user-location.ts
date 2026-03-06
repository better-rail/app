import { useState, useCallback } from "react"
import * as Location from "expo-location"

export type UserLocation = {
  latitude: number
  longitude: number
}

export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "error"

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [status, setStatus] = useState<LocationStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const requestLocation = useCallback(async () => {
    setStatus("requesting")
    setErrorMessage(null)

    try {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync()

      if (permissionStatus !== "granted") {
        setStatus("denied")
        return
      }

      setStatus("granted")

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      })
    } catch (error) {
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Unknown error")
    }
  }, [])

  const checkPermissionStatus = useCallback(async () => {
    try {
      const { status: permissionStatus } = await Location.getForegroundPermissionsAsync()
      if (permissionStatus === "granted") {
        setStatus("granted")
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  return {
    location,
    status,
    errorMessage,
    requestLocation,
    checkPermissionStatus,
    isLoading: status === "requesting",
    hasPermission: status === "granted",
  }
}
