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
    Route(
      departureTime: at(12),
      arrivalTime: at(55),
      trains: [
        Train(
          trainNumber: 6039,
          orignStation: 2300,
          destinationStation: 2800,
          arrivalTime: at(40),
          departureTime: at(12),
          stopStations: [
            StopStation(stationId: 2500, platform: 1, arrivalTime: at(25), departureTime: at(25))
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
          arrivalTime: at(55),
          departureTime: at(45),
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
