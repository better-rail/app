import SwiftUI
import WidgetKit
import ActivityKit

/// Bridges the Live Activity context into the platform-agnostic `WatchActivityCard`.
struct WatchLiveActivityView: View {
  var vm: ActivityViewModel

  var body: some View {
    WatchActivityCard(data: cardData)
  }

  private var isWaiting: Bool { vm.status == .waitForTrain || vm.status == .inExchange }

  private var statusLabel: LocalizedStringKey {
    switch vm.status {
    case .waitForTrain: return "headed to"
    case .inExchange: return "wait in"
    case .arrived: return "arrived at"
    case .getOff: return "arrive"
    case .inTransit: return vm.isStale ? "headed to" : "next station"
    }
  }

  private var stationName: String {
    if isWaiting || vm.status == .arrived || vm.isStale {
      return vm.destination.name
    }
    return vm.nextStop.name
  }

  private var badge: WatchActivityCardData.Badge {
    if isWaiting { return .platform(vm.train.originPlatform) }
    if vm.status == .arrived { return .none }
    if vm.status == .getOff { return .getOff }
    return .stopsLeft(vm.stopsLeft)
  }

  private var cardData: WatchActivityCardData {
    WatchActivityCardData(
      statusLabel: statusLabel,
      stationName: stationName,
      badge: badge,
      trainNumber: vm.train.trainNumber,
      targetDate: getStatusEndDate(context: vm.context),
      delay: vm.delay,
      isStale: vm.isStale,
      isArrived: vm.status == .arrived,
      accentColor: vm.delay >= 5 ? .purple : vm.status.color,
      isRTL: vm.isRTL
    )
  }
}
