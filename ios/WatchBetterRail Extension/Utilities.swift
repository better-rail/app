import Foundation

func formatRouteHour(_ dateString: String) -> String {
  let formatter = DateFormatter()
  formatter.dateFormat = "dd/MM/yyyy HH:mm:ss"
  formatter.timeZone = TimeZone(abbreviation: "UTC")

  let hourFormatter = DateFormatter()
  hourFormatter.dateFormat = "HH:mm"
  hourFormatter.timeZone = TimeZone(abbreviation: "UTC")
  
  let formattedDate = formatter.date(from: dateString)
  if let date = formattedDate {
    return hourFormatter.string(from: date)
  } else {
    return "--:--"
  }
}

enum SupportedLanguages: String {
  case english, hebrew, arabic
}

/// Returns the user perferred locale, lowercased.
///
/// Available options are `english`, `hebrew` and `arabic`
/// Defaults to `english`.
func getUserLocale() -> String {
  let langCode = Bundle.main.preferredLocalizations[0]
  let usLocale = Locale(identifier: "en-US")
  var langName = "english"
 
  if let languageName = usLocale.localizedString(forLanguageCode: langCode)?.lowercased() {
    if SupportedLanguages(rawValue: languageName) != nil {
      langName = languageName
    }
  }
  
  return langName
}
