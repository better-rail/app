import { useEffect, useState } from "react"
import { Platform } from "react-native"
import * as storage from "../utils/storage"

/**
 * For cases when the System font is wanted to be used instead of Heebo, when the app is
 * being used in English (The iOS default english font family is Heebo)
 */
export function useFontFamily() {
  const [fontFamily, setFontFamily] = useState("System")

  useEffect(() => {
    storage.load("appLanguage").then((languageCode) => {
      if (languageCode) {
        const isHeebo = languageCode !== "en" && Platform.OS === "ios"
        if (isHeebo) setFontFamily("Heebo")
      }
    })
  }, [])

  return { fontFamily, isHeebo: fontFamily === "Heebo" }
}
