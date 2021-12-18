import WidgetKit

struct TrainDetail: TimelineEntry {
  var date: Date
  let departureDate: String
  let departureTime: String
  let arrivalTime: String
  let platform: String
  let trainNumber: String
  let origin: Station
  let destination: Station
  var upcomingTrains: [UpcomingTrain]?
  var isTomorrow: Bool {
    let convertedDate = stringToDate(departureDate)!
    return Calendar(identifier: .hebrew).isDateInTomorrow(convertedDate)
  }
}

struct UpcomingTrain: Identifiable {
  var id: String { trainNumber }
  let departureTime: String
  let arrivalTime: String
  let platform: String
  let trainNumber: String
}
