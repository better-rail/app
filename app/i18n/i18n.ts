import { I18nManager } from "react-native"
import RNRestart from "react-native-restart"
import * as storage from "../utils/storage"

import * as Localization from "expo-localization"
import i18n from "i18n-js"
import { arSA as arIL, he as heIL, enUS, ru as ruIL } from "date-fns/locale"
import en from "./en.json"
import ar from "./ar.json"
import he from "./he.json"
import ru from "./ru.json"

i18n.fallbacks = true
i18n.translations = { he, en, ar, ru }

export type LanguageCode = "he" | "ar" | "en" | "ru"

export const isRTL = I18nManager.isRTL
export let userLocale: LanguageCode = "en"
export let dateFnsLocalization = enUS
export let dateDelimiter = " "
export let dateLocale = "en-US"
export const deviceLocale = Localization.locale

export function setInitialLanguage() {
  // If the user main locale is Hebrew / Arabic, we set it immidately to them.
  // Otherwise, we show a prompt asking which language the user would like to use.

  if (Localization.locale.startsWith("he")) {
    changeUserLanguage("he")
  } else if (Localization.locale.startsWith("ar")) {
    changeUserLanguage("ar")
  } else if (Localization.locale.startsWith("en")) {
    changeUserLanguage("en")
  } else if (Localization.locale.startsWith("ru")) {
    changeUserLanguage("ru")
  }
}

export function changeUserLanguage(languageCode: LanguageCode) {
  storage.save("appLanguage", languageCode).then(() => {
    setUserLanguage(languageCode)
    RNRestart.Restart()
  })
}

export function setUserLanguage(languageCode: LanguageCode) {
  if (languageCode === "he" || languageCode === "ar") {
    I18nManager.allowRTL(true)
    I18nManager.forceRTL(true)
  } else {
    I18nManager.allowRTL(false)
    I18nManager.forceRTL(false)
  }

  if (languageCode === "ar") {
    dateFnsLocalization = arIL
    dateDelimiter = " و- "
    dateLocale = "ar-IL"
  } else if (languageCode === "he") {
    dateFnsLocalization = heIL
    dateDelimiter = " ו- "
    dateLocale = "he-IL"
  } else if (languageCode === "ru") {
    dateFnsLocalization = ruIL
    dateLocale = "ru-IL"
  }

  userLocale = languageCode
  i18n.locale = languageCode
  if (
    ((languageCode === "he" || languageCode === "ar") && !isRTL) ||
    ((languageCode === "en" || languageCode === "ru") && isRTL)
  ) {
    RNRestart.Restart()
  }
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
