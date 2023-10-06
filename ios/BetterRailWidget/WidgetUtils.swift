import SwiftUI

func formatStationName(_ stationName: String, _ shouldTurnucate: Bool = true) -> String {
  shouldTurnucate ?
    stationName.turnucateTextAfterHyphen() :
    stationName
}

func shouldShowUpcomingTrain(_ isTomorrow: Bool, _ departureDate: String) -> Bool {
  if isTomorrow {
    if let futureDate = Calendar.current.date(byAdding: .hour, value: 23, to: .now) {
      return isoDateStringToDate(departureDate) <= futureDate
    } else {
      return false
    }
  } else {
    return true
  }
}

func getNoTrainsMessage(statusCode: String, date: Date) -> String? {
  if statusCode == "300" {
    if (NSCalendar(identifier: .hebrew)!.isDateInWeekend(date)) {
      return String(localized: "No trains for today.")
    }
    
    return String(localized: "No more trains for today.")
  } else if (statusCode == "404") {
    return String(localized: "Something went wrong.")
  } else {
    return nil
  }
}

extension View {
  func widgetBackground(_ content: some View) -> some View {
    if #available(watchOSApplicationExtension 10.0, iOSApplicationExtension 17.0, macOSApplicationExtension 14.0, *) {
      return containerBackground(for: .widget) {
        content
      }
    } else {
      return background {
        content
      }
    }
  }
  
  func widgetBackground(_ color: Color) -> some View {
      if #available(watchOSApplicationExtension 10.0, iOSApplicationExtension 17.0, macOSApplicationExtension 14.0, *) {
          return containerBackground(color, for: .widget)
      } else {
          return background(color)
      }
  }
}

extension WidgetConfiguration {
  func contentMarginsDisabledIfAvailable() -> some WidgetConfiguration {
    if #available(iOS 17.0, iOSApplicationExtension 17.0, macOSApplicationExtension 14.0, *) {
      return self.contentMarginsDisabled()
    } else {
      return self
    }
  }
}
