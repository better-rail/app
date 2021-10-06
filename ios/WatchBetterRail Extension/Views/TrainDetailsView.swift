//
//  BetterRail-Bridging-Header.swift
//  WatchBetterRail Extension
//
//  Created by Guy Tepper on 05/10/2021.
//

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

struct StationListItem: View {
  let time: String
  let stationName: String
  let platform: String
  let trainNumber: String?
  let imageName: String?
  
  init(time: String, stationName: String, platform: String, imageName: String?) {
    self.time = time
    self.stationName = stationName
    self.platform = platform
    self.trainNumber = nil
    self.imageName = imageName
  }
  
  
  init(time: String, stationName: String, platform: String, trainNumber: String, imageName: String?) {
    self.time = time
    self.stationName = stationName
    self.platform = platform
    self.trainNumber = trainNumber
    self.imageName = imageName
  }
  
  var body: some View {
    VStack(alignment: .leading) {
      Text(time).font(Font.custom("Heebo", size: 16)).fontWeight(.bold)
      Text(stationName).font(Font.custom("Heebo", size: 18)).fontWeight(.medium)
      
      if trainNumber != nil {
        Text("רציף \(platform)・רכבת מס׳ \(trainNumber!)").font(Font.custom("Heebo", size: 14))
      } else {
        Text("רציף \(platform)").font(Font.custom("Heebo", size: 14))
      }
    }.listRowBackground(StationImageBackground(imageName))
  }
}

struct TrainStopListItem: View {
  var time: String
  var stationName: String
  
  var body: some View {
    HStack(alignment: .center) {
      HStack {
        Text(time)
        Text("・")
        Text(stationName)
      }.font(Font.custom("Heebo", size: 14).bold()).foregroundColor(.secondary)
    }.padding(.leading, 4)
  }
}

// TODO: Change background color
// TODO: Add platform change & waiting time notices
struct TrainExchangeListItem: View {
  let stationName: String
  let time: String
  let platform: String
  
  var body: some View {
    VStack(alignment: .leading) {
      Text("\(Image(systemName: "arrow.left.arrow.right.circle.fill")) החלפה")
        .fontWeight(.semibold)
        .foregroundColor(Color.blue)
      
      Text(time).font(Font.custom("Heebo", size: 16)).fontWeight(.bold)
      Text(stationName).font(Font.custom("Heebo", size: 18)).fontWeight(.medium)
      Text("רציף \(platform)")
    }.font(Font.custom("Heebo", size: 14))
  }
}

struct TrainDetailsView_Previews: PreviewProvider {
    static var previews: some View {
      let trainDetails = Route(train: [Train(trainno: "742", orignStation: "3700", destinationStation: "4900", arrivalTime: "06/10/2021 13:58:00", departureTime: "06/10/2021 13:47:00", stopStations: [StopStation(stationId: "3600", arrivalTime: "06/10/2021 13:50:00", departureTime: "06/10/2021 13:50:00", platform: "1"), StopStation(stationId: "3700", arrivalTime: "06/10/2021 13:52:00", departureTime: "06/10/2021 13:50:00", platform: "1"), StopStation(stationId: "4600", arrivalTime: "06/10/2021 13:54:00", departureTime: "06/10/2021 13:50:00", platform: "1")], lineNumber: "6803500", route: "21", midnight: false, handicap: true, directTrain: true, reservedSeat: false, platform: "1", destPlatform: "5", isFullTrain: false)], isExchange: false, estTime: "1100")
      return  TrainDetailsView(trainRoute: trainDetails).environment(\.layoutDirection, .rightToLeft)
    }
}
