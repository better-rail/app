import SwiftUI
import WidgetKit
import ActivityKit

struct CircularProgressView: View {
  var vm: ActivityViewModel
  
  var start: Date { getStatusStartDate(context: vm.context) }
  
  var end: Date {
    if (vm.status == .waitForTrain || vm.status == .inExchange) {
      return vm.departureDate.addDelay(vm.delay)
    } else {
      return vm.arrivalDate.addDelay(vm.delay)
    }
  }
  
  var iconName: String {
    if (vm.status == .inExchange) {
      return "arrow.left.arrow.right"
    } else {
      return "train.side.front.car"
    }
  }
  
  var body: some View {
    ZStack {
      ProgressView(timerInterval: start...end, countsDown: false, label: {}, currentValueLabel: { EmptyView() }).progressViewStyle(.circular).tint(vm.status.color)
      Image(systemName: iconName).font(.system(size: 8.0))
        .scaleEffect(x: vm.isRTL ? -1 : 1, y: 1, anchor: .center)
    }
  }
}
