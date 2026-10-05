import { beforeEach, describe, expect, it, type Mock } from "bun:test"
import { Settings } from "react-native"
import { getLanguageChangedInIOSSettings } from "./i18n"

const settingsGet = Settings.get as Mock<typeof Settings.get>

function mockSettings(values: Record<string, unknown>) {
  settingsGet.mockImplementation((key: string) => values[key])
}

describe("getLanguageChangedInIOSSettings", () => {
  beforeEach(() => settingsGet.mockReset())

  it("ignores the iOS language until the app has synced one", () => {
    mockSettings({ AppleLanguages: ["he-IL", "en-US"] })
    expect(getLanguageChangedInIOSSettings()).toBeUndefined()
  })

  it("returns nothing when iOS Settings still has the synced language", () => {
    mockSettings({ syncedAppleLanguage: "en", AppleLanguages: ["en"] })
    expect(getLanguageChangedInIOSSettings()).toBeUndefined()
  })

  it("returns the language picked in iOS Settings", () => {
    mockSettings({ syncedAppleLanguage: "he", AppleLanguages: ["en"] })
    expect(getLanguageChangedInIOSSettings()).toBe("en")
  })

  it("adopts the device language after the per-app language is reset", () => {
    mockSettings({ syncedAppleLanguage: "en", AppleLanguages: ["ar-IL", "en-US"] })
    expect(getLanguageChangedInIOSSettings()).toBe("ar")
  })

  it("ignores unsupported languages", () => {
    mockSettings({ syncedAppleLanguage: "he", AppleLanguages: ["fr-FR"] })
    expect(getLanguageChangedInIOSSettings()).toBeUndefined()
  })
})
