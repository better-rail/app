import Foundation

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
func formatRouteDate(_ date: Date) -> (String, String) {
  let dateFormatter = DateFormatter()
  dateFormatter.locale = Locale(identifier: "en_us")
  
  dateFormatter.dateFormat = "yyyy-MM-dd"
  let routeDate = dateFormatter.string(from: date)
  
  dateFormatter.dateFormat = "HH:mm"
  let routeTime = dateFormatter.string(from: date)
  
  return (routeDate, routeTime)
}

func isoDateStringToDate(_ isoDate: String) -> Date {
  let dateFormatter = DateFormatter()
  dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
  
  if let date = dateFormatter.date(from: isoDate) {
    return date
  } else {
    return Date()
  }
}

func formatRouteHour(_ isoDate: String) -> String {
  let date = isoDateStringToDate(isoDate);
  
  let hourFormatter = DateFormatter()
  hourFormatter.dateFormat = "HH:mm"
  
  return hourFormatter.string(from: date)
}

func formatDateHour(_ date: Date) -> String {
  let formatter = DateFormatter()
  formatter.locale = Locale(identifier: "he_IL")
  formatter.setLocalizedDateFormatFromTemplate("HH:mm")
  formatter.dateFormat = "HH:mm"
  
  return formatter.string(from: date)
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
