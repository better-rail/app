import Foundation
import SwiftUI
import WidgetKit
import ActivityKit


struct LockScreenWaitingForTrainView: View {
  var vm: ActivityViewModel
    
  var body: some View {
    VStack(alignment: .leading) {
      ActivityHeaderStatus(vm: vm, stationName: vm.train.originStationName)
      
      HStack(alignment: .lastTextBaseline) {
        VStack(alignment: .leading, spacing: 2.0) {
          Text(vm.status == .inExchange ? "wait in" : "headed to")
            .font(vm.isEnglish ? .caption2 : .caption)
          Text("\(vm.destination.name)")
            .font(vm.isEnglish ? .callout : .body).heavyWide()
        }
        
        Spacer()
        
        TimeInformation(vm: vm)
      }
      
      RideInformationBar(vm: vm)
    }
  }
}

