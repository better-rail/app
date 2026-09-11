import Foundation

let tlvStation = getStationById(4600)!
let jlmStation = getStationById(680)!

let upcoming1 = UpcomingTrain(departureTime: "10:03", arrivalTime: "10:29", platform: 3, trainNumber: 255)
let upcoming2 = UpcomingTrain(departureTime: "10:26", arrivalTime: "10:52", platform: 2, trainNumber: 257)
let upcoming3 = UpcomingTrain(departureTime: "11:03", arrivalTime: "11:29", platform: 3, trainNumber: 521)
let upcoming4 = UpcomingTrain(departureTime: "11:26", arrivalTime: "12:03", platform: 2, trainNumber: 259)
let upcoming5 = UpcomingTrain(departureTime: "12:03", arrivalTime: "12:29", platform: 3, trainNumber: 971)
let upcoming6 = UpcomingTrain(departureTime: "12:26", arrivalTime: "12:52", platform: 2, trainNumber: 261)
let upcoming7 = UpcomingTrain(departureTime: "13:03", arrivalTime: "13:29", platform: 3, trainNumber: 523)
let upcoming8 = UpcomingTrain(departureTime: "13:26", arrivalTime: "14:03", platform: 2, trainNumber: 263)
let upcoming9 = UpcomingTrain(departureTime: "14:03", arrivalTime: "14:29", platform: 3, trainNumber: 973)

let upcomingTrainsSnapshot = [upcoming1, upcoming2, upcoming3, upcoming4, upcoming5, upcoming6, upcoming7, upcoming8, upcoming9]

func createSnapshotEntry(origin: Station = tlvStation, destination: Station = jlmStation, label: String? = nil) -> TrainDetail {
  return TrainDetail(
    date: Date(),
    departureDate: "09/01/2007 09:43:00",
    departureTime: "09:43",
    arrivalTime: "10:09",
    platform: 1,
    trainNumber: 261,
    origin: origin,
    destination: destination,
    label: label,
    upcomingTrains: upcomingTrainsSnapshot
  )
}
