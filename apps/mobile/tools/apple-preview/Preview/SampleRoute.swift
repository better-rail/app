import Foundation

/// Preview-only sample route: Tel Aviv Ha'Shalom → Tel Aviv Savidor → Herzliya.
///
/// Times are generated relative to *now* — a Live Activity whose route is in the past
/// makes `ProgressView(timerInterval:)` trap on an inverted range.
enum SampleRoute {
  static func at(_ minutesFromNow: Int) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "he_IL")
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
    return formatter.string(from: Date().addingTimeInterval(Double(minutesFromNow) * 60))
  }

  static var route: Route {
    route(minutesToDeparture: 12)
  }

  static func route(minutesRemaining: Int, status: ActivityStatus) -> Route {
    switch status {
    case .waitForTrain:
      return route(minutesToDeparture: minutesRemaining)
    case .inExchange:
      // The second train departs 33 minutes after the first one.
      return route(minutesToDeparture: minutesRemaining - 33)
    case .inTransit, .getOff, .arrived:
      // The first train arrives 28 minutes after departing.
      return route(minutesToDeparture: minutesRemaining - 28)
    }
  }

  static func route(minutesToDeparture: Int) -> Route {
    let offset = minutesToDeparture - 12
    return Route(
      departureTime: at(12 + offset),
      arrivalTime: at(55 + offset),
      trains: [
        Train(
          trainNumber: 6039,
          orignStation: 2300,
          destinationStation: 2800,
          arrivalTime: at(40 + offset),
          departureTime: at(12 + offset),
          stopStations: [
            StopStation(stationId: 2500, platform: 1, arrivalTime: at(25 + offset), departureTime: at(25 + offset))
          ],
          routeStations: [
            RouteStation(stationId: 2300, arrivalTime: "14:08", platform: 2),
            RouteStation(stationId: 2500, arrivalTime: "14:20", platform: 1),
            RouteStation(stationId: 2800, arrivalTime: "14:36", platform: 1),
          ],
          originPlatform: 3,
          destPlatform: 1,
          trainPosition: nil
        ),
        Train(
          trainNumber: 6239,
          orignStation: 2800,
          destinationStation: 2820,
          arrivalTime: at(55 + offset),
          departureTime: at(45 + offset),
          stopStations: [],
          routeStations: [
            RouteStation(stationId: 2800, arrivalTime: "14:41", platform: 3),
            RouteStation(stationId: 2820, arrivalTime: "14:45", platform: 1),
          ],
          originPlatform: 2,
          destPlatform: 1,
          trainPosition: nil
        ),
      ]
    )
  }
}
