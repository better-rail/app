import SwiftUI
import WidgetKit
import ActivityKit

// MARK: - Home / Lock screen widget

#Preview("Widget · small", as: .systemSmall) {
  BetterRailWidget()
} timeline: {
  createSnapshotEntry()
}

#Preview("Widget · medium", as: .systemMedium) {
  BetterRailWidget()
} timeline: {
  createSnapshotEntry()
}

#Preview("Widget · large", as: .systemLarge) {
  BetterRailWidget()
} timeline: {
  createSnapshotEntry()
}

#Preview("Widget · rectangular", as: .accessoryRectangular) {
  BetterRailWidget()
} timeline: {
  createSnapshotEntry()
}

#Preview("Widget · circular", as: .accessoryCircular) {
  BetterRailWidget()
} timeline: {
  createSnapshotEntry()
}

// MARK: - Live Activity (iPhone presentations)

private let attributes = BetterRailActivityAttributes(
  activityStartDate: Date(),
  route: SampleRoute.route
)

#Preview("Lock screen", as: .content, using: attributes) {
  BetterRailLiveActivity()
} contentStates: {
  BetterRailActivityAttributes.ContentState(delay: 0, nextStationId: 2300, status: .waitForTrain)
  BetterRailActivityAttributes.ContentState(delay: 7, nextStationId: 2300, status: .waitForTrain)
  BetterRailActivityAttributes.ContentState(delay: 0, nextStationId: 2500, status: .inTransit)
  BetterRailActivityAttributes.ContentState(delay: 0, nextStationId: 2800, status: .arrived)
}

#Preview("Dynamic Island", as: .dynamicIsland(.expanded), using: attributes) {
  BetterRailLiveActivity()
} contentStates: {
  BetterRailActivityAttributes.ContentState(delay: 0, nextStationId: 2300, status: .waitForTrain)
  BetterRailActivityAttributes.ContentState(delay: 0, nextStationId: 2500, status: .inTransit)
}
