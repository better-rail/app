import SwiftUI
import WidgetKit
import ActivityKit

enum Content {
  case icon
  case time
}

struct CircularProgressView: View {
  var vm: ActivityViewModel
  var content: Content
  
  var start: Date { getStatusStartDate(context: vm.context) }
  
  var end: Date {
    if (vm.status == .waitForTrain || vm.status == .inExchange) {
      return vm.departureDate.addMinutes(vm.delay)
    } else {
      return vm.arrivalDate.addMinutes(vm.delay)
    }
  }
  
  var iconName: String {
    if (vm.status == .inExchange) {
      return "arrow.left.arrow.right"
    } else {
      return "train.side.front.car"
    }
  }
  
  var minutesLeft: Int {
    getMinutesLeft(targetDate: end)
  }
  
  var tintColor: Color
  
  var body: some View {
    ZStack {
      ProgressView(timerInterval: start...end, countsDown: false, label: {}, currentValueLabel: { EmptyView() }).progressViewStyle(.circular).tint(tintColor)
      
      if content == .time && vm.context.attributes.frequentPushesEnabled && minutesLeft < 100 {
        Text(String(minutesLeft))
          .font(.system(size: 11, weight: .semibold))
      } else {
        Image(systemName: iconName).font(.system(size: 8.0))
          .scaleEffect(x: vm.isRTL ? -1 : 1, y: 1, anchor: .center)
      }
    }
  }
}
