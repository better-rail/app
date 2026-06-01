import SwiftUI

struct TrainDetailsView: View {
    var trainRoute: Route
      
      var body: some View {
        List {
          ForEach(trainRoute.trains.indices, id: \.self) { index in
            let train = trainRoute.trains[index]
            
            StationListItem(time: train.departureTime, delay: train.delay, stationName: train.originStationName, platform: train.platform, trainNumber: train.trainNumber, imageName: train.stationImage)
            
            ForEach(train.stopStations) { stopStation in
              TrainStopListItem(stopStation: stopStation, delay: train.delay)
            }
            
            if trainRoute.isExchange && trainRoute.trains.count - 1 != index {
              TrainExchangeListItem(stationName: train.destinationStationName, time: train.arrivalTime, delay: train.delay, arrivalPlatform: train.destPlatform, departurePlatform: trainRoute.trains[index + 1].platform)
            } else {
              StationListItem(time: train.arrivalTime,
                              delay: train.delay,
                              stationName: train.destinationStationName,
                              platform: train.destPlatform,
                              imageName: train.destinationStationImage)
            }
          }
      }
    }
}

struct TrainDetailsView_Previews: PreviewProvider {
    static var previews: some View {
      let trainDetails = Route(departureTime: "2023-06-09T14:08:00", arrivalTime: "2023-06-09T14:45:00", trains: [Train(trainNumber: 6039, orignStation: 2300, destinationStation: 2800, arrivalTime: "2023-06-09T14:36:00", departureTime: "2023-06-09T14:08:00", stopStations: [StopStation(stationId: 2500, platform: 1, arrivalTime: "2023-06-09T14:20:00", departureTime: "2023-06-09T14:20:00")], routeStations: [RouteStation(stationId: 1600, arrivalTime: "13:16", platform: 1), RouteStation(stationId: 1500, arrivalTime: "13:25", platform: 2), RouteStation(stationId: 1400, arrivalTime: "13:35", platform: 1), RouteStation(stationId: 700, arrivalTime: "13:39", platform: 1), RouteStation(stationId: 1300, arrivalTime: "13:43", platform: 1), RouteStation(stationId: 1220, arrivalTime: "13:47", platform: 1), RouteStation(stationId: 2100, arrivalTime: "13:56", platform: 1), RouteStation(stationId: 2200, arrivalTime: "14:01", platform: 2), RouteStation(stationId: 2300, arrivalTime: "14:08", platform: 2), RouteStation(stationId: 2500, arrivalTime: "14:20", platform: 1), RouteStation(stationId: 2800, arrivalTime: "14:36", platform: 1), RouteStation(stationId: 3500, arrivalTime: "15:02", platform: 5), RouteStation(stationId: 3600, arrivalTime: "15:10", platform: 2), RouteStation(stationId: 3700, arrivalTime: "15:15", platform: 3)], originPlatform: 2, destPlatform: 1, trainPosition: TrainPosition(calcDiffMinutes: 3)), Train(trainNumber: 6239, orignStation: 2800, destinationStation: 2820, arrivalTime: "2023-06-09T14:45:00", departureTime: "2023-06-09T14:41:00", stopStations: [], routeStations: [RouteStation(stationId: 2800, arrivalTime: "14:41", platform: 3), RouteStation(stationId: 2820, arrivalTime: "14:45", platform: 1), RouteStation(stationId: 3100, arrivalTime: "14:51", platform: 1), RouteStation(stationId: 3300, arrivalTime: "15:01", platform: 2), RouteStation(stationId: 3400, arrivalTime: "15:07", platform: 1), RouteStation(stationId: 3500, arrivalTime: "15:16", platform: 4), RouteStation(stationId: 3600, arrivalTime: "15:23", platform: 2), RouteStation(stationId: 3700, arrivalTime: "15:30", platform: 4), RouteStation(stationId: 4600, arrivalTime: "15:32", platform: 3), RouteStation(stationId: 4900, arrivalTime: "15:37", platform: 3), RouteStation(stationId: 4800, arrivalTime: "15:46", platform: 2), RouteStation(stationId: 5000, arrivalTime: "15:53", platform: 3), RouteStation(stationId: 5300, arrivalTime: "16:00", platform: 2), RouteStation(stationId: 5200, arrivalTime: "16:05", platform: 1)], originPlatform: 3, destPlatform: 1, trainPosition: TrainPosition(calcDiffMinutes: 2))])
      return TrainDetailsView(trainRoute: trainDetails)
    }
}
