import * as StoreReview from "expo-store-review"

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
