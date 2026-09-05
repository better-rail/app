import SwiftUI
import WidgetKit
import ActivityKit

struct LockScreenLiveActivityView: View {
  var vm: ActivityViewModel
  
  var body: some View {
    if (vm.status == .waitForTrain || vm.status == .inExchange) {
      LockScreenWaitingForTrainView(vm: vm)
    } else {
      LockScreenInTransitView(vm: vm)
    }
  }
}
