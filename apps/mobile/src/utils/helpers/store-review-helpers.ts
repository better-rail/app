import { Linking, Platform } from "react-native"
import * as StoreReview from "expo-store-review"

const STORE_REVIEW_URL = Platform.select({
  ios: "https://apps.apple.com/app/better-rail/id1562982976?action=write-review",
  android: "market://details?id=com.betterrail",
})

/**
 * Requests the native in-app store review prompt, guarding on platform availability.
 * Resolves once the request flow finishes (or is skipped when unavailable).
 */
export async function requestStoreReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview()
    }
  } catch {
    // Requesting a review is best-effort — ignore failures.
  }
}

/**
 * Opens the store's write-review page. openURL rejects when the store app can't handle the link
 * (e.g. App Store restricted via Screen Time), so fall back to the native in-app review prompt.
 */
export async function openStoreReviewPage(): Promise<void> {
  if (!STORE_REVIEW_URL) return

  try {
    await Linking.openURL(STORE_REVIEW_URL)
  } catch {
    await requestStoreReview()
  }
}
