import Foundation
import SwiftUI
import WidgetKit
import ActivityKit


struct LockScreenWaitingForTrainView: View {
  var vm: ActivityViewModel
  
  var body: some View {
    VStack(alignment: .leading) {
      ActivityHeader(vm: vm)

      HStack(alignment: .lastTextBaseline) {
        VStack(alignment: .leading, spacing: vm.isRTL ? 1.0 : 2.0) {
          Text(vm.status == .inExchange ? "wait in" : "headed to")
            .fontWeight(vm.isRTL ? .regular : .light)
            .font(vm.isRTL ? .subheadline2 : .caption2)
          Text("\(vm.destination.name)")
            .font(vm.isRTL ? .body : .callout).heavyWide()
        }
        
        Spacer()
        
        TimeInformation(vm: vm)
      }

      RideInformationBar(vm: vm)
    }
  }
}
