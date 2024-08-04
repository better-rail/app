import SwiftUI
import Foundation
import WidgetKit
import ActivityKit

struct LockScreenInTransitView: View {
  var vm: ActivityViewModel
  @State var activityFamily: ActivityFamilyCompat = .small

  var body: some View {
    if #available(iOSApplicationExtension 18.0, *) {
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

        if activityFamily != .small {
          RideInformationBar(vm: vm)
        }
      }
      .modifier(ActivityFamilyModifier(activityFamily: $activityFamily))
      .onAppear {
        let a = EnvironmentValues().activityFamily
        print("Helolo.", a)
      }
      .onChange(of: activityFamily) { oldValue, newValue in
        print(oldValue, newValue)
      }
    } else {
      // Fallback on earlier versions
      Text("OK..")
    }
  }
}

// Define ActivityFamily enum for iOS 17 and earlier
enum ActivityFamilyCompat {
    case small
    case medium
}


// Custom modifier to handle ActivityFamily
struct ActivityFamilyModifier: ViewModifier {
    @Binding var activityFamily: ActivityFamilyCompat

  func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content
                .environment(\.activityFamily, .small) // Default to small
                .onChange(of: EnvironmentValues().activityFamily) { _, newValue in
                  print(newValue)
                    switch newValue {
                    case .medium:
                        activityFamily = .medium
                    default:
                        activityFamily = .small
                    }
                }
        } else {
            content
        }
    }
}
