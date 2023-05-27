import { useEffect, useState } from "react"
import { Platform } from "react-native"
import * as storage from "../utils/storage"

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
