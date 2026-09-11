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

// MARK: - Apple Watch Smart Stack card

/// The `.small` activity family has no `ActivityPreviewViewKind`, so the card is previewed
/// directly at Smart Stack size. Run the `WatchPreview` scheme to see it on a real watch screen.
private struct WatchCardFrame: View {
  var title: String
  var data: WatchActivityCardData
  var size: CGSize

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(title)
        .font(.caption2)
        .foregroundStyle(.secondary)

      WatchActivityCard(data: data)
        .environment(\.colorScheme, .dark)
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .frame(width: size.width, height: size.height)
        .background(Color(white: 0.11), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
  }
}

#Preview("Watch · 45mm") {
  ScrollView {
    VStack(alignment: .leading, spacing: 14) {
      ForEach(WatchCardSamples.all, id: \.0) { name, data in
        WatchCardFrame(title: name, data: data, size: CGSize(width: 172, height: 78))
      }
    }
    .padding()
  }
  .background(.black)
  .preferredColorScheme(.dark)
}

#Preview("Watch · sizes") {
  VStack(alignment: .leading, spacing: 14) {
    WatchCardFrame(title: "41mm", data: WatchCardSamples.waiting, size: CGSize(width: 156, height: 74))
    WatchCardFrame(title: "45mm", data: WatchCardSamples.waiting, size: CGSize(width: 172, height: 78))
    WatchCardFrame(title: "49mm (Ultra)", data: WatchCardSamples.waiting, size: CGSize(width: 184, height: 82))
  }
  .padding()
  .background(.black)
  .preferredColorScheme(.dark)
}

#Preview("Watch · Hebrew") {
  VStack(alignment: .leading, spacing: 14) {
    WatchCardFrame(title: "עברית", data: WatchCardSamples.hebrew, size: CGSize(width: 172, height: 78))
  }
  .padding()
  .background(.black)
  .environment(\.layoutDirection, .rightToLeft)
  .environment(\.locale, .init(identifier: "he"))
  .preferredColorScheme(.dark)
}
