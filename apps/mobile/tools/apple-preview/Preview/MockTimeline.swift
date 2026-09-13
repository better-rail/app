import Foundation
import WidgetKit

/// Sample schedule for the home-screen widget, generated relative to now so the "departs
/// in" countdown and the platform / train columns have something to show. Compiled into the
/// preview widget only (`PREVIEW_MOCK_TIMELINE`); the shipping widget fetches live routes.
///
/// Pick the scenario from the extension's defaults, then reinstall to reload the timeline:
///
///   xcrun simctl spawn <udid> defaults write il.co.better-rail.preview.BetterRailWidget \
///     previewScenario tomorrow      # tomorrow | empty | error | (unset) regular day
///   xcrun simctl spawn <udid> defaults write il.co.better-rail.preview.BetterRailWidget \
///     previewLabel Work             # shows the label chip
func previewMockTimeline(for configuration: RouteIntent) -> Timeline<TrainDetail> {
  let origin = configuration.origin?.identifier.flatMap { getStationById(Int($0)!) } ?? tlvStation
  let destination = configuration.destination?.identifier.flatMap { getStationById(Int($0)!) } ?? jlmStation
  let defaults = UserDefaults.standard
  let label = defaults.string(forKey: "previewLabel") ?? configuration.label
  let generator = EntriesGenerator()

  switch defaults.string(forKey: "previewScenario")?.lowercased() {
  case "empty":
    return Timeline(entries: [generator.getEmptyEntry(originId: Int(origin.id)!, destinationId: Int(destination.id)!, label: nil)], policy: .never)
  case "error":
    return Timeline(entries: [generator.getEmptyEntry(originId: Int(origin.id)!, destinationId: Int(destination.id)!, label: nil, errorCode: 404)], policy: .never)
  case "tomorrow":
    let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date().midnight)!.addMinutes(6 * 60 + 12)
    return Timeline(entries: [mockEntry(from: tomorrow, origin: origin, destination: destination, label: nil)], policy: .never)
  default:
    let next = Date().addMinutes(14)
    return Timeline(entries: [mockEntry(from: next, origin: origin, destination: destination, label: label)], policy: .never)
  }
}

private func mockEntry(from departure: Date, origin: Station, destination: Station, label: String?) -> TrainDetail {
  let iso = DateFormatter()
  iso.locale = Locale(identifier: "he_IL")
  iso.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"

  // (minutes after the next train, journey minutes, platform, train number)
  let schedule: [(Int, Int, Int, Int)] = [
    (23, 34, 2, 257), (46, 26, 3, 521), (69, 41, 2, 259), (93, 26, 3, 971),
    (116, 34, 0, 263), (146, 26, 3, 265), (176, 41, 1, 267), (206, 26, 3, 269), (236, 34, 2, 271),
  ]

  return TrainDetail(
    date: Date(),
    departureDate: iso.string(from: departure),
    departureTime: formatDateHour(departure),
    arrivalTime: formatDateHour(departure.addMinutes(26)),
    platform: 1,
    trainNumber: 261,
    origin: origin,
    destination: destination,
    label: label,
    upcomingTrains: schedule.map { offset, duration, platform, number in
      let time = departure.addMinutes(offset)
      return UpcomingTrain(
        departureTime: formatDateHour(time),
        arrivalTime: formatDateHour(time.addMinutes(duration)),
        platform: platform,
        trainNumber: number
      )
    }
  )
}
