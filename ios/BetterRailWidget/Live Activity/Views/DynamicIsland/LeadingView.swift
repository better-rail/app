import Foundation
import SwiftUI
import WidgetKit
import ActivityKit


struct LeadingView: View {
  var vm: ActivityViewModel
  
  var headerStation: String {
    if (vm.status == .waitForTrain || vm.status == .inExchange) {
      return vm.train.originStationName
    }
    
    return vm.train.destinationStationName
  }
  
  var nextStationLabel: LocalizedStringKey {
    if (vm.status == .waitForTrain || vm.status == .inExchange) {
      return "headed to"
    } else {
      return "next station"
    }
  }
  
  var nextStation: String {
    if (vm.status == .waitForTrain || vm.status == .inExchange) {
      return vm.train.destinationStationName
    }
    
    return vm.nextStop.name
  }
  
  
  
  var body: some View {
    VStack(alignment: .leading, spacing: 2.0) {
      Spacer()
      Text(nextStationLabel).font(.caption)
      Text(nextStation).heavyWide()
    }
  }
}
