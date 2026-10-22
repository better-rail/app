/**
 * i18n.ts — the notification texts in four languages.
 *
 * A twenty-line translator in place of i18n-js: the catalogue is flat strings
 * with `%{name}` placeholders, no plurals, and the CommonJS build of i18n-js
 * doesn't load under the Workers bundler. Same behaviour: a `scope` prefixes
 * the key, a key missing in the locale falls back to Hebrew (the default), and
 * a key missing everywhere comes back as the i18n-js "[missing …]" marker so it
 * shows up rather than crashes.
 */
import { arSA as arIL, he as heIL, enUS, ru as ruIL } from "date-fns/locale"

import en from "./en.json"
import he from "./he.json"
import ru from "./ru.json"
import ar from "./ar.json"

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

export type TranslateOptions = { scope?: string } & Record<string, unknown>

const DEFAULT_LOCALE = LanguageCode.he
const catalogue: Record<LanguageCode, unknown> = { en, he, ru, ar }

const lookup = (locale: LanguageCode, path: string): string | undefined => {
  const value = path
    .split(".")
    .reduce<unknown>(
      (node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined),
      catalogue[locale],
    )
  return typeof value === "string" ? value : undefined
}

export const translate = (key: string, locale: LanguageCode, options: TranslateOptions = {}) => {
  const { scope, ...values } = options
  const path = scope ? `${scope}.${key}` : key
  const template = lookup(locale, path) ?? lookup(DEFAULT_LOCALE, path)
  if (template === undefined) return `[missing "${locale}.${path}" translation]`
  return template.replace(/%\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match))
}
