import { useEffect, useState } from "react"
import * as storage from "@/utils/storage"

/**
 * For cases when the System font is wanted to be used instead of Heebo, when the app is
 * being used in English (the System font reads better than Heebo for Latin text).
 * Heebo is now bundled on both iOS and Android, so non-English locales get Heebo on either platform.
 */
export function useFontFamily() {
  const [fontFamily, setFontFamily] = useState("System")

  useEffect(() => {
    storage.load("appLanguage").then((languageCode) => {
      if (languageCode) {
        const isHeebo = languageCode !== "en"
        if (isHeebo) setFontFamily("Heebo")
      }
    })
  }, [])

  return { fontFamily, isHeebo: fontFamily === "Heebo" }
}
