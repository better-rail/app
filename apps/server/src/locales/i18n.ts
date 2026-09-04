import { I18n, TranslateOptions } from "@lagregance/i18n-js-require"
import { arSA as arIL, he as heIL, enUS, ru as ruIL } from "date-fns/locale"

import en from "./en.json"
import he from "./he.json"
import ru from "./ru.json"
import ar from "./ar.json"

const i18n = new I18n({
  en,
  he,
  ru,
  ar,
})

i18n.defaultLocale = "he"
i18n.enableFallback = true

export const dateFnLocales = {
  en: enUS,
  he: heIL,
  ru: ruIL,
  ar: arIL,
}

export const railApiLocales = {
  en: "English",
  he: "Hebrew",
  ru: "Russian",
  ar: "Arabic",
}

export enum LanguageCode {
  en = "en",
  he = "he",
  ru = "ru",
  ar = "ar",
}

export const translate = (key: string, locale: LanguageCode, options?: TranslateOptions) => {
  i18n.locale = locale
  return i18n.t(key, options)
}
