import SwiftUI
import AlarmKit
import UserNotifications

/// Schedules an arrival alarm the way the app does, so the notification service extension can be tested with:
/// `xcrun simctl push <udid> il.co.better-rail.preview Preview/arrival-alarm-push.json`
/// (the push's `alarmId` has to match the one shown here).
struct ArrivalAlarmSection: View {
  @State private var minutes = 2
  @State private var state = ArrivalAlarmStore.load()
  @State private var authorization = "–"
  @State private var error: String?
  @AppStorage("pushToken") private var pushToken = "–"

  // Matches Preview/arrival-alarm-push.json.
  private let alarmId = UUID(uuidString: "6F1C7A52-58F1-4B47-9C55-6C1D5D1D2A11")!

  var body: some View {
    Section("Arrival alarm") {
      Button("Allow alarms & notifications") {
        Task {
          _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
          if #available(iOS 26.0, *) {
            _ = try? await AlarmManager.shared.requestAuthorization()
          }
          refresh()
        }
      }
      LabeledContent("Alarm authorization", value: authorization)

      Stepper("Rings in \(minutes) min", value: $minutes, in: 1...30)
      Button("Schedule alarm") {
        Task { await schedule() }
      }
      // Runs the push payload through the same code path as the extension; simctl push doesn't launch extensions.
      Button("Simulate push: move to \(minutes) min from now") {
        Task { await simulatePush() }
      }
      Button("Cancel alarm", role: .destructive) {
        if #available(iOS 26.0, *) { ArrivalAlarmScheduler.cancel() }
        refresh()
      }

      LabeledContent("Rings at", value: state.map { $0.fireDate.formatted(date: .omitted, time: .standard) } ?? "No alarm")
      if let error {
        Text(error).font(.footnote).foregroundStyle(.red)
      }
      Button("Refresh", action: refresh)
      LabeledContent("Push token") {
        Text(pushToken).font(.caption2.monospaced()).textSelection(.enabled)
      }
    }
    .onAppear(perform: refresh)
  }

  private func schedule() async {
    guard #available(iOS 26.0, *) else { return }

    let alarm = ArrivalAlarmState(rideId: "preview-ride", alarmId: alarmId, title: "Approaching Tel Aviv - HaHagana",
                                  stopText: "Stop", fireDate: Date().addingTimeInterval(TimeInterval(minutes * 60)))
    do {
      try await ArrivalAlarmScheduler.schedule(alarm)
      error = nil
    } catch {
      self.error = String(describing: error)
    }
    refresh()
  }

  private func simulatePush() async {
    guard #available(iOS 26.0, *) else { return }

    let userInfo: [AnyHashable: Any] = ["alarm": [
      "rideId": "preview-ride",
      "alarmId": alarmId.uuidString.lowercased(),
      "fireDate": NSNumber(value: Int(Date().timeIntervalSince1970) + minutes * 60),
    ]]
    guard let push = ArrivalAlarmPush(userInfo: userInfo) else {
      error = "Couldn't parse the push"
      return
    }

    let moved = await ArrivalAlarmScheduler.move(push)
    error = moved ? nil : "The alarm wasn't moved"
    refresh()
  }

  private func refresh() {
    state = ArrivalAlarmStore.load()
    if #available(iOS 26.0, *) {
      authorization = String(describing: AlarmManager.shared.authorizationState)
    } else {
      authorization = "Needs iOS 26"
    }
  }
}
