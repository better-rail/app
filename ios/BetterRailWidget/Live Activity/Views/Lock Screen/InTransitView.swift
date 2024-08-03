import SwiftUI
import Foundation
import WidgetKit
import ActivityKit

struct LockScreenInTransitView: View {
  var vm: ActivityViewModel
  var activityFamily: ActivityFamily = .medium

  init(vm: ActivityViewModel) {
    self.vm = vm

    if #available(iOS 18.0, *) {
      let environment = EnvironmentValues()
      if environment.activityFamily == .medium {
        self.activityFamily = .medium
      } else {
        self.activityFamily = .small
      }
    }
  }

  var body: some View {
    VStack(alignment: .leading) {
      ActivityHeader(vm: vm)
      
      HStack(alignment: .bottom) {
        VStack(alignment: .leading) {
          if (vm.status == .arrived) {
            Text("arrived at").font(.subheadline2)
          } else {
            Text(vm.isStale ? "headed to" : "next station")
              .fontWeight(vm.isRTL ? .regular : .light)
              .font(vm.isRTL ? .subheadline2 : .caption)
          }

          Text(vm.isStale ? vm.destination.name : vm.nextStop.name)
              .font(vm.isRTL ? .body : .callout).heavyWide()
        }

        Spacer()

        TimeInformation(vm: vm)
      }.padding(.top, vm.status == .arrived ? 10.0 : 0)
      
      RideInformationBar(vm: vm)
    }
  }
}

// Define ActivityFamily enum for iOS 17 and earlier
enum ActivityFamily {
    case small
    case medium
}
