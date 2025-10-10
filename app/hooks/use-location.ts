import { useState, useEffect, useCallback } from "react"
import * as Location from "expo-location"

export type LocationState = {
  latitude: number | null
  longitude: number | null
  loading: boolean
  error: string | null
  permissionStatus: Location.PermissionStatus | null
  refresh: () => void
}

/**
 * Hook to get the user's current location
 * Handles permission requests and location fetching
 */
export function useLocation() {
  const [state, setState] = useState<Omit<LocationState, "refresh">>({
    latitude: null,
    longitude: null,
    loading: true,
    error: null,
    permissionStatus: null,
  })

  const fetchLocation = useCallback(async (forceRefresh: boolean = false) => {
    setState((prev) => ({ ...prev, loading: true }))

    try {
      // Check permission status first
      const { status } = await Location.getForegroundPermissionsAsync()

      if (status !== "granted") {
        // Request permission if not granted
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync()

        if (newStatus !== "granted") {
          setState({
            latitude: null,
            longitude: null,
            loading: false,
            error: "Location permission denied",
            permissionStatus: newStatus,
          })
          return
        }
      }

      // If forceRefresh, skip cached location and get fresh GPS
      if (forceRefresh) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        setState({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          loading: false,
          error: null,
          permissionStatus: Location.PermissionStatus.GRANTED,
        })
      } else {
        // Try to get last known location first for instant results
        const lastKnown = await Location.getLastKnownPositionAsync()

        if (lastKnown) {
          // Show last known location immediately
          setState({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            loading: false,
            error: null,
            permissionStatus: Location.PermissionStatus.GRANTED,
          })
        } else {
          // Get current location with balanced accuracy
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })

          setState({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            loading: false,
            error: null,
            permissionStatus: Location.PermissionStatus.GRANTED,
          })
        }
      }
    } catch (error) {
      setState({
        latitude: null,
        longitude: null,
        loading: false,
        error: error.message || "Failed to get location",
        permissionStatus: null,
      })
    }
  }, [])

  const refresh = useCallback(() => {
    fetchLocation(true)
  }, [fetchLocation])

  useEffect(() => {
    fetchLocation(false)
  }, [fetchLocation])

  return {
    ...state,
    refresh,
  }
}
