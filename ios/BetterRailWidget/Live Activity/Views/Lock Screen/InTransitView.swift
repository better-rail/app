import SwiftUI
import Foundation
import WidgetKit
import ActivityKit

struct LockScreenInTransitView: View {
  var vm: ActivityViewModel
  
  var body: some View {
    VStack(alignment: .leading) {
      ActivityHeaderStatus(vm: vm, stationName: vm.destination.name).padding(.bottom, vm.status == .arrived ? 12.0 : 0.0)
      
      HStack(alignment: .bottom) {
        VStack(alignment: .leading, spacing: 2.0) {
          if (vm.status == .arrived) {
            Text("arrived at").font(.caption)
          } else {
            Text("next station").font(.caption)
          }
          Text(vm.nextStop.name).fontWeight(.heavy).fontWidth(Font.Width(0.1))
        }
        
        Spacer()
        
        TimeInformation(vm: vm)
      }

      RideInformationBar(vm: vm)
    }
  }
}


