import SwiftUI
import ActivityKit

/// Container app for the widget extension — an `.appex` can't run on its own.
/// Start/stop a Live Activity here to see the real card, including on a paired watch.
@main
struct HostApp: App {
  @UIApplicationDelegateAdaptor(PushTokenDelegate.self) private var pushTokenDelegate

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
  @State private var minutesRemaining = 6

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
          .disabled(activity != nil)
          Stepper("Delay: \(delay) min", value: $delay, in: 0...30)
          Picker("Time remaining (min)", selection: $minutesRemaining) {
            ForEach([1, 6, 12, 99, 120, 999], id: \.self) { minutes in
              Text("\(minutes)").tag(minutes)
            }
          }
          .pickerStyle(.segmented)
          .disabled(activity != nil)
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

        ArrivalAlarmSection()

        Section {
          Text("Lock the device (⌘L) to see the lock-screen card. The Smart Stack card is what a paired Apple Watch shows.")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      }
      .navigationTitle("Live Activity Preview")
      .task {
        if let existingActivity = Activity<BetterRailActivityAttributes>.activities.first {
          status = existingActivity.content.state.status
          delay = existingActivity.content.state.delay
          activity = existingActivity
        }
      }
    }
  }

  private var contentState: BetterRailActivityAttributes.ContentState {
    .init(
      delay: delay,
      nextStationId: status == .waitForTrain ? 2300 : status == .inExchange ? 2800 : 2500,
      status: status
    )
  }

  private func startOrUpdate() async {
    if let activity {
      await activity.update(ActivityContent(state: contentState, staleDate: Date().addMinutes(30)))
      return
    }

    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

    let attributes = BetterRailActivityAttributes(
      activityStartDate: Date(),
      route: SampleRoute.route(minutesRemaining: minutesRemaining, status: status)
    )

    activity = try? Activity.request(
      attributes: attributes,
      content: ActivityContent(state: contentState, staleDate: Date().addMinutes(30)),
      pushType: nil
    )
  }
}
