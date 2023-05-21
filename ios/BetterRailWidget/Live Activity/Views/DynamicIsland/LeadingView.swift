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
    
    else if (vm.route.trains.count > 1) {
      let lastTrainIndex = vm.route.trains.count - 1
      return vm.route.trains[lastTrainIndex].destinationStationName
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
    VStack(alignment: .leading, spacing: -1) {
      Spacer()
      Text(nextStationLabel).font(.caption2)
      Text(nextStation).heavyWide()
    }
  }
}
