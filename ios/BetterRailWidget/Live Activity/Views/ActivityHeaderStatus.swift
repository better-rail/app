//
//  ActivityHeaderStatus.swift
//  BetterRailWidgetExtension
//
//  Created by Guy Tepper on 12/04/2023.
//

import SwiftUI

struct ActivityHeaderStatus: View {
  var vm: ActivityViewModel
  let stationName: String
  var status: ActivityStatus { vm.status }
  
  var text: LocalizedStringKey {
    let station = stationName.uppercased()
    
    if (status == .waitForTrain) {
      return "departs from \(station)"
    } else if (status == .inExchange) {
      return "exchange in \(station)"
    } else {
      return "train to \(station)"
    }
  }
  
  var iconName: String {
    if (status == .inExchange) {
      return "arrow.left.arrow.right"
    } else {
      return "train.side.front.car"
    }
  }
  
  var body: some View {
    HStack(spacing: 6.0) {
      ZStack {
        RoundedRectangle(cornerRadius: 6.0)
          .frame(width: 25, height: 25).foregroundColor(status.color)
        Image(systemName: iconName)
          .font(.system(size: 8))
          .scaleEffect(x: vm.isRTL ? -1 : 1, y: 1, anchor: .center)
      }
      
      Text(text)
        .font(.caption).bold().foregroundColor(status.color)
    }
  }
}
