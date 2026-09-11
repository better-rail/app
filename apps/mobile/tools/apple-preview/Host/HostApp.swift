import SwiftUI
import ActivityKit

/// Container app for the widget extension — an `.appex` can't run on its own.
/// Start/stop a Live Activity here to see the real card, including on a paired watch.
@main
struct HostApp: App {
  var body: some Scene {
    WindowGroup {
      HostView()
    }
  }
}

private struct HostView: View {
  @State private var activity: Activity<BetterRailActivityAttributes>?
  @State private var status: ActivityStatus = .waitForTrain
  @State private var delay = 0

  var body: some View {
    NavigationStack {
      Form {
        Section("State") {
          Picker("Status", selection: $status) {
            Text("Wait for train").tag(ActivityStatus.waitForTrain)
            Text("In transit").tag(ActivityStatus.inTransit)
            Text("In exchange").tag(ActivityStatus.inExchange)
            Text("Get off").tag(ActivityStatus.getOff)
            Text("Arrived").tag(ActivityStatus.arrived)
          }
          Stepper("Delay: \(delay) min", value: $delay, in: 0...30)
        }

        Section {
          Button(activity == nil ? "Start Live Activity" : "Update Live Activity") {
            Task { await startOrUpdate() }
          }
          Button("End Live Activity", role: .destructive) {
            Task { await activity?.end(nil, dismissalPolicy: .immediate); activity = nil }
          }
          .disabled(activity == nil)
        }

        Section {
          Text("Lock the device (⌘L) to see the lock-screen card. The Smart Stack card is what a paired Apple Watch shows.")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      }
      .navigationTitle("Live Activity Preview")
    }
  }

  private var contentState: BetterRailActivityAttributes.ContentState {
    .init(delay: delay, nextStationId: status == .waitForTrain ? 2300 : 2500, status: status)
  }

  private func startOrUpdate() async {
    if let activity {
      await activity.update(ActivityContent(state: contentState, staleDate: Date().addMinutes(30)))
      return
    }

    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

    let attributes = BetterRailActivityAttributes(
      activityStartDate: Date(),
      route: SampleRoute.route
    )

    activity = try? Activity.request(
      attributes: attributes,
      content: ActivityContent(state: contentState, staleDate: Date().addMinutes(30)),
      pushType: nil
    )
  }
}
