import SwiftUI
import Foundation
import WidgetKit
import ActivityKit

struct LockScreenInTransitView: View {
  var vm: ActivityViewModel
  
  var body: some View {
    VStack(alignment: .leading) {
      ActivityHeader(vm: vm)
      
      HStack(alignment: .bottom) {
        VStack(alignment: .leading) {
          if (vm.status == .arrived) {
            Text("arrived at").font(.subheadline2)
          } else {
            Text("next station")
              .fontWeight(vm.isRTL ? .regular : .light)
              .font(vm.isRTL ? .subheadline2 : .caption)
          }

          Text(vm.nextStop.name)
            .font(vm.isRTL ? .body : .callout).heavyWide()

        }

        Spacer()

        TimeInformation(vm: vm)
      }
      .padding(.top, vm.status == .arrived ? 10.0 : 0)
      
      RideInformationBar(vm: vm)
    }
  }
}
