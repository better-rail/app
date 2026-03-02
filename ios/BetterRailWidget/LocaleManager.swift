import Foundation
import SwiftUI

class LocaleManager {
    static let shared = LocaleManager()

    private let appGroupUserDefaults: UserDefaults?

    private init() {
        self.appGroupUserDefaults = UserDefaults(suiteName: "group.il.co.better-rail")
    }

    func getAppLanguage() -> String {
        return appGroupUserDefaults?.string(forKey: "userLocale") ?? "en"
    }

    func getAppLocale() -> Locale {
        return Locale(identifier: getAppLanguage())
    }

    func isAppRTL() -> Bool {
        let languageCode = getAppLanguage()
        return languageCode == "he" || languageCode == "ar"
    }

    func getLayoutDirection() -> LayoutDirection {
        return isAppRTL() ? .rightToLeft : .leftToRight
    }
}
