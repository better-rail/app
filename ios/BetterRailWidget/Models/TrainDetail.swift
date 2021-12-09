import WidgetKit

struct TrainDetail: TimelineEntry {
  var date: Date
  let departureTime: String
  let arrivalTime: String
  let platform: String
  let trainNumber: String
  let origin: Station
  let destination: Station
  var upcomingTrains: [UpcomingTrain]?
}

struct UpcomingTrain: Identifiable {
  var id: String { trainNumber }
  let departureTime: String
  let arrivalTime: String
  let platform: String
  let trainNumber: String
}
