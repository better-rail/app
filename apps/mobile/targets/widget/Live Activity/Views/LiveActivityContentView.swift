import SwiftUI
import WidgetKit
import ActivityKit

/// `.small` is the Apple Watch Smart Stack card (iOS 18+); `.medium` is the iPhone lock screen.
struct LiveActivityContentView: View {
  var vm: ActivityViewModel

  var body: some View {
    if #available(iOS 18.0, *) {
      FamilyAwareContentView(vm: vm)
    } else {
      LockScreenContent(vm: vm)
    }
  }
}

@available(iOS 18.0, *)
private struct FamilyAwareContentView: View {
  @Environment(\.activityFamily) private var activityFamily
  var vm: ActivityViewModel

  var body: some View {
    switch activityFamily {
    case .small:
      WatchLiveActivityView(vm: vm)
        .padding(.horizontal, 4)
        .containerBackground(for: .widget) {
          LinearGradient(
            colors: [(vm.delay >= 5 ? Color.purple : vm.status.color).opacity(0.16), .clear],
            startPoint: .top,
            endPoint: .bottom
          )
        }
    default:
      LockScreenContent(vm: vm)
    }
  }
}

private struct LockScreenContent: View {
  var vm: ActivityViewModel

  var body: some View {
    LockScreenLiveActivityView(vm: vm)
      .padding()
      .background(Color(UIColor.systemBackground))
  }
}
