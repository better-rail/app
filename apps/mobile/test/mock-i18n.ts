import { mock } from "bun:test"

mock.module("i18n-js", () => ({
  default: {
    t: (key: string) => `${key}.test`,
    locale: "en",
    defaultLocale: "en",
    translations: {},
    translate: (key: string) => `${key}.test`,
  },
  t: (key: string) => `${key}.test`,
  locale: "en",
  defaultLocale: "en",
  translations: {},
  translate: (key: string) => `${key}.test`,
}))
