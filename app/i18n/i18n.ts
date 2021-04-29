import { I18nManager } from "react-native"
import * as Localization from "expo-localization"
import i18n from "i18n-js"
import { he as heIL, enUS } from "date-fns/locale"
import en from "./en.json"
import he from "./he.json"

i18n.fallbacks = true
i18n.translations = { he, en }

i18n.locale = "en"
// i18n.locale = Localization.locale || "en"

export const userLocale = "en"

export let dateFnsLocalization = enUS
export let dateDelimiter = " "

if (userLocale === "he") {
  dateFnsLocalization = heIL
  dateDelimiter = " ו- "
}

export const isRTL = I18nManager.isRTL

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
