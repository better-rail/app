import Foundation

let tlvStation = getStationById(4600)!
let jlmStation = getStationById(680)!

/// Sample times in the user's clock style, so the gallery matches the installed widget
private func snapshotTime(_ hour: Int, _ minute: Int) -> String {
  formatDateHour(Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: Date())!)
}

let upcoming1 = UpcomingTrain(departureTime: snapshotTime(10, 3), arrivalTime: snapshotTime(10, 29), platform: 3, trainNumber: 255)
let upcoming2 = UpcomingTrain(departureTime: snapshotTime(10, 26), arrivalTime: snapshotTime(10, 52), platform: 2, trainNumber: 257)
let upcoming3 = UpcomingTrain(departureTime: snapshotTime(11, 3), arrivalTime: snapshotTime(11, 29), platform: 3, trainNumber: 521)
let upcoming4 = UpcomingTrain(departureTime: snapshotTime(11, 26), arrivalTime: snapshotTime(12, 3), platform: 2, trainNumber: 259)
let upcoming5 = UpcomingTrain(departureTime: snapshotTime(12, 3), arrivalTime: snapshotTime(12, 29), platform: 3, trainNumber: 971)


let upcomingTrainsSnapshot = [upcoming1, upcoming2, upcoming3, upcoming4, upcoming5]

func createSnapshotEntry(origin: Station = tlvStation, destination: Station = jlmStation, label: String? = nil) -> TrainDetail {
  return TrainDetail(
    date: Date(),
    departureDate: "09/01/2007 09:43:00",
    departureTime: snapshotTime(9, 43),
    arrivalTime: snapshotTime(10, 9),
    platform: 1,
    trainNumber: 261,
    origin: origin,
    destination: destination,
    label: label,
    upcomingTrains: upcomingTrainsSnapshot
  )
}
