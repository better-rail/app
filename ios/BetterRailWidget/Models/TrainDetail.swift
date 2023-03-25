import WidgetKit

struct TrainDetail: TimelineEntry {
  var date: Date
  let departureDate: String
  let departureTime: String
  let arrivalTime: String
  let platform: Int
  let trainNumber: Int
  let origin: Station
  let destination: Station
  var upcomingTrains: [UpcomingTrain]?
  var isTomorrow: Bool {
    let convertedDate = isoDateStringToDate(departureDate)
    return Calendar(identifier: .hebrew).isDateInTomorrow(convertedDate)
  }
}

struct UpcomingTrain: Identifiable {
  var id: Int { trainNumber }
  let departureTime: String
  let arrivalTime: String
  let platform: Int
  let trainNumber: Int
}
