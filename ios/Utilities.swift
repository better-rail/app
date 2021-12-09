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

func formatRouteHour(_ dateString: String) -> String {
  let hourFormatter = DateFormatter()
  hourFormatter.dateFormat = "HH:mm"
  
  let formattedDate = stringToDate(dateString)
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

func getNoTrainsMessage(date: Date) -> String {
  if (NSCalendar(identifier: .hebrew)!.isDateInWeekend(date)) {
    return "No trains for today."
  }
  
  return "No more trains for today."
}
