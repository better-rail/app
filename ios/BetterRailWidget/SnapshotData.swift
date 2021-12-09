import Foundation

let tlvStation = getStationById("4600")!
let jlmStation = getStationById("680")!

let upcoming1 = UpcomingTrain(departureTime: "10:03", arrivalTime: "10:29", platform: "3", trainNumber: "1321")
let upcoming2 = UpcomingTrain(departureTime: "10:26", arrivalTime: "10:52", platform: "2", trainNumber: "3212")
let upcoming3 = UpcomingTrain(departureTime: "11:03", arrivalTime: "11:29", platform: "3", trainNumber: "212")
let upcoming4 = UpcomingTrain(departureTime: "11:26", arrivalTime: "12:03", platform: "2", trainNumber: "321")
let upcoming5 = UpcomingTrain(departureTime: "12:03", arrivalTime: "12:29", platform: "3", trainNumber: "2121")


let upcomingTrainsSnapshot = [upcoming1, upcoming2, upcoming3, upcoming4, upcoming5]

let snapshotEntry = TrainDetail(
  date: Date(),
  departureTime: "09:43",
  arrivalTime: "10:09",
  platform: "1",
  trainNumber: "312",
  origin: tlvStation,
  destination: jlmStation,
  upcomingTrains: upcomingTrainsSnapshot
)


