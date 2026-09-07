import { createContext, useContext } from "react"
import { he, type TranslationKey } from "./he"
import { en } from "./en"

export type Locale = "he" | "en"
export const locales: Locale[] = ["he", "en"]
export const defaultLocale: Locale = "he"

export type { TranslationKey }

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { he, en }

type Params = Record<string, string | number>

export function translate(locale: Locale, key: TranslationKey, params?: Params): string {
  const template = dictionaries[locale][key] ?? dictionaries.he[key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (params[name] !== undefined ? String(params[name]) : `{${name}}`))
}

export const isLocale = (value: unknown): value is Locale => value === "he" || value === "en"

/** Resolves the `{-$locale}` path param; Hebrew has no prefix. */
export function resolveLocale(param: string | undefined): Locale | null {
  if (param === undefined) return "he"
  return param === "en" ? "en" : null
}

export const dir = (locale: Locale) => (locale === "he" ? "rtl" : "ltr")
export const htmlLang = (locale: Locale) => (locale === "he" ? "he-IL" : "en")
export const ogLocale = (locale: Locale) => (locale === "he" ? "he_IL" : "en_US")

/** Prefixes a site path with the locale segment when needed (`/stations` → `/en/stations`). */
export function localePath(locale: Locale, path: string): string {
  if (locale === "he") return path
  if (path === "/") return "/en"
  return `/en${path}`
}

export const LocaleContext = createContext<Locale>(defaultLocale)

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useT() {
  const locale = useLocale()
  return (key: TranslationKey, params?: Params) => translate(locale, key, params)
}
