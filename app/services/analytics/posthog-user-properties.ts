import AsyncStorage from "@react-native-async-storage/async-storage"

const STORAGE_KEY = "posthog_user_properties"

let cache: Record<string, string> = {}
let hydrated = false
let dirtyBeforeHydration = false

const persist = () => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache)).catch((error) => {
    if (__DEV__) {
      console.warn("Failed to persist PostHog user properties", error)
    }
  })
}

type Properties = Record<string, string>

const applyMerge = (updates: Properties): Properties => {
  const changedEntries = Object.entries(updates).filter(([key, value]) => cache[key] !== value)

  if (changedEntries.length === 0) {
    return {}
  }

  const merged: Properties = {}

  changedEntries.forEach(([key, value]) => {
    cache[key] = value
    merged[key] = value
  })

  if (hydrated) {
    persist()
  } else {
    dirtyBeforeHydration = true
  }

  return merged
}

export const hydratePosthogProperties = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed: Properties = JSON.parse(stored)
      cache = dirtyBeforeHydration ? { ...parsed, ...cache } : parsed
    }
  } catch (error) {
    if (__DEV__) {
      console.warn("Failed to hydrate PostHog user properties", error)
    }
  } finally {
    hydrated = true
    if (dirtyBeforeHydration) {
      persist()
    }
  }
}

export const setCachedPosthogProperty = (name: string, value: string) => {
  return applyMerge({ [name]: value })
}

export const setCachedPosthogProperties = (properties: Properties) => {
  return applyMerge(properties)
}
