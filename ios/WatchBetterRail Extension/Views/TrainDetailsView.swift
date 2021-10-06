//
//  BetterRail-Bridging-Header.swift
//  WatchBetterRail Extension
//
//  Created by Guy Tepper on 05/10/2021.
//

import SwiftUI

struct TrainDetailsView: View {
    var trainDetails: Train
    
      var body: some View {
        List {
          VStack(alignment: .leading) {
            Text(formatRouteHour(trainDetails.departureTime)).font(Font.custom("Heebo", size: 20)).fontWeight(.bold)
            Text(trainDetails.originStationName).font(Font.custom("Heebo", size: 16)).fontWeight(.medium)
            
            
            Text("רציף \(trainDetails.platform)・רכבת מס׳ \(trainDetails.trainno)")
          }.font(Font.custom("Heebo", size: 14))
//          .background(Image("tlv-hashalom").resizable())
          
          ForEach(trainDetails.stopStations) { stopStation in
            TrainStopListItem(time: stopStation.formattedTime, stationName: stopStation.stationName)
          }
          
          TrainExchangeListItem()
      }
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

struct TrainExchangeListItem: View {
  var body: some View {
    VStack(alignment: .leading) {
      Text("\(Image(systemName: "arrow.left.arrow.right.circle.fill")) החלפה")
        .fontWeight(.semibold)
        .foregroundColor(Color.blue)
                  Text("09:41").font(Font.custom("Heebo", size: 20)).fontWeight(.bold)
      Text("בית יהושוע").font(Font.custom("Heebo", size: 16)).fontWeight(.medium)
      Text("רציף 2・רכבת מס׳ 185")
    }.font(Font.custom("Heebo", size: 14))
  }
}

struct BetterRail_Bridging_Header_Previews: PreviewProvider {
    static var previews: some View {
      let trainDetails = Train(trainno: "742", orignStation: "3700", destinationStation: "4900", arrivalTime: "06/10/2021 13:58:00", departureTime: "06/10/2021 13:47:00", stopStations: [StopStation(stationId: "3600", arrivalTime: "06/10/2021 13:50:00", departureTime: "06/10/2021 13:50:00", platform: "1"), StopStation(stationId: "3700", arrivalTime: "06/10/2021 13:52:00", departureTime: "06/10/2021 13:50:00", platform: "1"), StopStation(stationId: "4600", arrivalTime: "06/10/2021 13:54:00", departureTime: "06/10/2021 13:50:00", platform: "1")], lineNumber: "6803500", route: "21", midnight: false, handicap: true, directTrain: true, reservedSeat: false, platform: "1", destPlatform: "5", isFullTrain: false)
      return  TrainDetailsView(trainDetails: trainDetails).environment(\.layoutDirection, .rightToLeft)
    }
}
