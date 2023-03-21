import Foundation

func stringToDate(_ dateString: String) -> Date? {
  let formatter = DateFormatter()
  formatter.dateFormat = "dd/MM/yyyy HH:mm:ss"

  return formatter.date(from: dateString)
}

///  Convert  a time string to a Date value
/// - parameter timeString  - The time string formatted as  HH:mm  (e.g. 09:43)
func getDateFromTimeString(_ timeString: String) -> Date? {
    // Convert string to date
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    let optionalTimeDate = formatter.date(from: timeString)

    // Apply time to the current date
    if let timeDate  = optionalTimeDate {
        let hour = Calendar.current.component(.hour, from: timeDate)
        let minute = Calendar.current.component(.minute, from: timeDate)
        return Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: Date())
    }
    
    return nil
}

/// Converts a date to formatted string for Israel Railways API
func formatRouteDate(_ date: Date) -> String {
  let dateFormatter = DateFormatter()
  dateFormatter.locale = Locale(identifier: "en_us")
  dateFormatter.dateFormat = "yyyyMMdd"
  return dateFormatter.string(from: date)
}

func formatRouteHour(_ isoDate: String) -> String {
  let dateFormatter = DateFormatter()
  dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
  
  let date = dateFormatter.date(from: isoDate)!
  
  dateFormatter.dateFormat = "HH:mm"
  
  return dateFormatter.string(from: date)
}

enum SupportedLanguages: String {
  case english, hebrew, arabic, russian
}

/// Returns the user perferred locale, lowercased.
///
/// Available options are `english`, `hebrew`, `arabic` and `russian`
/// Defaults to `english`.
func getUserLocale() -> SupportedLanguages {
  let langCode = Bundle.main.preferredLocalizations[0]
  let usLocale = Locale(identifier: "en-US")
  var langName = SupportedLanguages.english
 
  if let languageName = usLocale.localizedString(forLanguageCode: langCode)?.lowercased() {
    if let languageValue = SupportedLanguages(rawValue: languageName) {
      langName = languageValue
    }
  }
  
  return langName
}
