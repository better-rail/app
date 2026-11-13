import { useState } from "react"
import * as storage from "@/utils/storage"

/**
 * For cases when the System font is wanted to be used instead of Heebo, when the app is
 * being used in English (the System font reads better than Heebo for Latin text).
 * Heebo is now bundled on both iOS and Android, so non-English locales get Heebo on either platform.
 */
export function useFontFamily() {
  // State, not the i18n module variable: the compiler would cache that read for good
  const [fontFamily] = useState(() => ((storage.load("appLanguage") ?? "en") === "en" ? "System" : "Heebo"))

  return { fontFamily, isHeebo: fontFamily === "Heebo" }
}
