import SwiftUI

struct TrainDetailsView: View {
    var trainRoute: Route
      
      var body: some View {
        let trainDetails = trainRoute.train
        List {
          ForEach(trainDetails.indices) { index in
            let train = trainDetails[index]
            
            StationListItem(time: formatRouteHour(train.departureTime), stationName: train.originStationName, platform: train.platform, trainNumber: train.trainno, imageName: train.stationImage)
            
            ForEach(train.stopStations) { stopStation in
              TrainStopListItem(time: stopStation.formattedTime, stationName: stopStation.stationName)
              }
            
            trainRoute.isExchange && trainDetails.count - 1 != index ?
              // Using AnyView to avoid different view types error
            AnyView(TrainExchangeListItem(stationName: train.destinationStationName, time: train.formattedArrivalTime, arrivalPlatform: train.destPlatform, departurePlatform: trainDetails[index + 1].platform)) :
            AnyView(StationListItem(time: formatRouteHour(train.arrivalTime), stationName: train.destinationStationName, platform: train.destPlatform, imageName: train.destinationStationImage ))
          }
      }
    }
}

struct TrainDetailsView_Previews: PreviewProvider {
    static var previews: some View {
      let trainDetails = Route(train: [Train(trainno: "243", orignStation: "3400", destinationStation: "3700", arrivalTime: "07/10/2021 11:54:00", departureTime: "07/10/2021 11:35:00", stopStations: [StopStation(stationId: "3500", arrivalTime: "07/10/2021 11:43:00", departureTime: "07/10/2021 11:43:00", platform: "4"), StopStation(stationId: "3600", arrivalTime: "07/10/2021 11:50:00", departureTime: "07/10/2021 11:50:00", platform: "2")], lineNumber: "3", route: "1", midnight: false, handicap: true, directTrain: false, reservedSeat: false, platform: "1", destPlatform: "4", isFullTrain: false), Train(trainno: "739", orignStation: "3700", destinationStation: "680", arrivalTime: "07/10/2021 12:55:00", departureTime: "07/10/2021 12:12:00", stopStations: [StopStation(stationId: "4600", arrivalTime: "07/10/2021 12:14:00", departureTime: "07/10/2021 12:14:00", platform: "2"), StopStation(stationId: "4900", arrivalTime: "07/10/2021 12:19:00", departureTime: "07/10/2021 12:19:00", platform: "3"), StopStation(stationId: "8600", arrivalTime: "07/10/2021 12:29:00", departureTime: "07/10/2021 12:29:00", platform: "1")], lineNumber: "35000680", route: "21", midnight: false, handicap: true, directTrain: true, reservedSeat: false, platform: "4", destPlatform: "2", isFullTrain: false)], isExchange: true, estTime: "01:20:00")
      return  TrainDetailsView(trainRoute: trainDetails).environment(\.layoutDirection, .rightToLeft)
    }
}
