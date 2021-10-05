//
//  BetterRail-Bridging-Header.swift
//  WatchBetterRail Extension
//
//  Created by Guy Tepper on 05/10/2021.
//

import SwiftUI

struct TrainDetailsView: View {
//    var trainDetails: Train
    
      var body: some View {
        List {
          VStack(alignment: .leading) {
//            Text(formatRouteHour(trainDetails.departureTime)).font(Font.custom("Heebo", size: 20)).fontWeight(.bold)
//            Text(getStationNameById(trainDetails.orignStation)).font(Font.custom("Heebo", size: 16)).fontWeight(.medium)
            Text("09:42").font(Font.custom("Heebo", size: 20)).fontWeight(.bold)
            Text("בית יהושוע").font(Font.custom("Heebo", size: 16)).fontWeight(.medium)

            Text("רציף 2・רכבת מס׳ 185")
          }.font(Font.custom("Heebo", size: 14))
          
          HStack(alignment: .center) {
            Spacer()
            Text("09:46 ・ הרצליה").font(Font.custom("Heebo", size: 16)).fontWeight(.bold)
            Spacer()
          }.opacity(0.6)
          
          HStack(alignment: .center) {
            Spacer()
            Text("09:46 ・ הרצליה").font(Font.custom("Heebo", size: 16)).fontWeight(.bold)
            Spacer()
          }.opacity(0.6)
          
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
  }

struct BetterRail_Bridging_Header_Previews: PreviewProvider {
    static var previews: some View {
        TrainDetailsView()
    }
}
