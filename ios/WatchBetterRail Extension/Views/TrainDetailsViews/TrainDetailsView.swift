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
              AnyView(TrainExchangeListItem(stationName: train.destinationStationName, time: train.formattedArrivalTime, platform: train.destPlatform)) :
              AnyView(StationListItem(time: formatRouteHour(train.arrivalTime), stationName: train.destinationStationName, platform: train.destPlatform, imageName: train.stationImage ))
          }
      }
    }
}

struct TrainDetailsView_Previews: PreviewProvider {
    static var previews: some View {
      let trainDetails = Route(train: [Train(trainno: "742", orignStation: "3700", destinationStation: "4900", arrivalTime: "06/10/2021 13:58:00", departureTime: "06/10/2021 13:47:00", stopStations: [StopStation(stationId: "3600", arrivalTime: "06/10/2021 13:50:00", departureTime: "06/10/2021 13:50:00", platform: "1"), StopStation(stationId: "3700", arrivalTime: "06/10/2021 13:52:00", departureTime: "06/10/2021 13:50:00", platform: "1"), StopStation(stationId: "4600", arrivalTime: "06/10/2021 13:54:00", departureTime: "06/10/2021 13:50:00", platform: "1")], lineNumber: "6803500", route: "21", midnight: false, handicap: true, directTrain: true, reservedSeat: false, platform: "1", destPlatform: "5", isFullTrain: false)], isExchange: false, estTime: "1100")
      return  TrainDetailsView(trainRoute: trainDetails).environment(\.layoutDirection, .rightToLeft)
    }
}
