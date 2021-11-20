import WidgetKit

struct TrainDetail: TimelineEntry {
  var date: Date
  let departureTime: String
  let arrivalTime: String
  let platform: String
  let trainNumber: String
}
