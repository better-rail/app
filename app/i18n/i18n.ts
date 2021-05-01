import { Alert, I18nManager } from "react-native"
import RNRestart from "react-native-restart"
import * as storage from "../utils/storage"

import * as Localization from "expo-localization"
import i18n from "i18n-js"
import { he as heIL, enUS } from "date-fns/locale"
import en from "./en.json"
import he from "./he.json"

i18n.fallbacks = true
i18n.translations = { he, en }

export const isRTL = I18nManager.isRTL
export let userLocale = "en"
export let dateFnsLocalization = enUS
export let dateDelimiter = " "
export let dateLocale = "en-US"

export function setInitialLanguage() {
  // If the user main locale is Hebrew / Arabic, we set it immidately to them.
  // Otherwise, we show a prompt asking which language the user would like to use.

  if (Localization.locale.startsWith("he")) {
    changeUserLanguage("he")
  } else {
    changeUserLanguage("en")
  }
}

export function changeUserLanguage(languageCode?: "he" | "en") {
  storage.save("appLanguage", languageCode).then(() => {
    setUserLanguage(languageCode)
    RNRestart.Restart()
  })
}

export function setUserLanguage(languageCode?: "he" | "en") {
  if (languageCode === "he") {
    I18nManager.allowRTL(true)
    I18nManager.forceRTL(true)

    dateFnsLocalization = heIL
    dateDelimiter = " ו- "
    dateLocale = "he-IL"
  } else {
    I18nManager.allowRTL(false)
    I18nManager.forceRTL(false)
  }

  userLocale = languageCode
  i18n.locale = languageCode

  // It seems like isRTL is incorrect if called immediately.
  setTimeout(() => {
    // If the app language doesn't match the layout direction, we have to restart the app once more.
    if ((languageCode === "he" && !isRTL) || (languageCode === "en" && isRTL)) {
      RNRestart.Restart()
    }
  }, 50)
}

/**
 * Builds up valid keypaths for translations.
 * Update to your default locale of choice if not English.
 */
type DefaultLocale = typeof he
export type TxKeyPath = RecursiveKeyOf<DefaultLocale>

type RecursiveKeyOf<TObj extends Record<string, any>> = {
  [TKey in keyof TObj & string]: TObj[TKey] extends Record<string, any>
    ? `${TKey}` | `${TKey}.${RecursiveKeyOf<TObj[TKey]>}`
    : `${TKey}`
}[keyof TObj & string]
