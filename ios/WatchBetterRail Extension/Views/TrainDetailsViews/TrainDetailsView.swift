import SwiftUI

struct TrainDetailsView: View {
    var trainRoute: Route
      
      var body: some View {
        List {
          ForEach(trainRoute.trains.indices, id: \.self) { index in
            let train = trainRoute.trains[index]
            
            StationListItem(time: formatRouteHour(train.departureTime), stationName: train.originStationName, platform: train.platform, trainNumber: train.trainNumber, imageName: train.stationImage)
            
            ForEach(train.stopStations) { stopStation in
              TrainStopListItem(time: stopStation.formattedTime, stationName: stopStation.stationName)
              }
            
            trainRoute.isExchange && trainRoute.trains.count - 1 != index ?
              // Using AnyView to avoid different view types error
            AnyView(TrainExchangeListItem(stationName: train.destinationStationName, time: train.formattedArrivalTime, arrivalPlatform: train.destPlatform, departurePlatform: trainRoute.trains[index + 1].platform)) :
            AnyView(StationListItem(time: formatRouteHour(train.arrivalTime), stationName: train.destinationStationName, platform: train.destPlatform, imageName: train.destinationStationImage ))
          }
      }
    }
}

//struct TrainDetailsView_Previews: PreviewProvider {
//    static var previews: some View {
//      let trainDetails = Route(trains: [Train(trainNumber: 243, orignStation: 3400, destinationStation: 3700, arrivalTime: "2023-03-21T06:21:00", departureTime: "2023-03-21T05:56:00", stopStations: [StopStation(stationId: 3500, arrivalTime: "2023-03-21T06:21:00", departureTime: "2023-03-21T05:56:00", platform: 4), StopStation(stationId: 3600, arrivalTime: "2023-03-21T06:24:00", departureTime: "2023-03-21T05:26:00", platform: 2)], lineNumber: 3, platform: 1, destPlatform: 4]))
//      return  TrainDetailsView(trainRoute: trainDetails).environment(\.layoutDirection, .rightToLeft)
//    }
//}
