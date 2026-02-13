import Foundation
import SwiftUI

let appGroupUserDefaults = UserDefaults(suiteName: "group.il.co.better-rail")

func getAppLanguage() -> String {
  return appGroupUserDefaults?.string(forKey: "userLocale") ?? "en"
}

func getAppLocale() -> Locale {
  let languageCode = getAppLanguage()
  return Locale(identifier: languageCode)
}

func isAppRTL() -> Bool {
  let languageCode = getAppLanguage()
  return languageCode == "he" || languageCode == "ar"
}

func getLayoutDirection() -> LayoutDirection {
  return isAppRTL() ? .rightToLeft : .leftToRight
}
