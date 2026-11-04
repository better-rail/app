import ActivityKit
import WidgetKit
import SwiftUI


struct BetterRailLiveActivity: Widget {
  func tintColor(context: ActivityViewContext<BetterRailActivityAttributes>) -> Color {
    return context.state.delay >= 5 ? .purple : context.state.status.color
  }
  
  func deepLinkURL(_ trainNumbers: [Int]) -> URL {
    // convert train numbers to be used as a URL parameter
    let urlParam = trainNumbers.map(String.init).joined(separator: ",")
    return URL(string: "liveactivity://?trains=\(urlParam)")!
  }
  
  var body: some WidgetConfiguration {
    // Opts the activity into the Apple Watch Smart Stack card; without it watchOS falls
    // back to the minimal Dynamic Island view.
    if #available(iOS 18.0, *) {
      return configuration.supplementalActivityFamilies([.small])
    } else {
      return configuration
    }
  }

  private var configuration: some WidgetConfiguration {
      ActivityConfiguration(for: BetterRailActivityAttributes.self) { context in
        LiveActivityContentView(vm: ActivityViewModel(context: context))
          .widgetURL(deepLinkURL(context.attributes.trainNumbers))

      } dynamicIsland: { context in
      let vm = ActivityViewModel(context: context)
      return DynamicIsland {
          DynamicIslandExpandedRegion(.leading, priority: 10) {
            LeadingView(vm: vm)
              .dynamicIsland(verticalPlacement: .belowIfTooWide)
              .padding(.leading, 4)
          }
          DynamicIslandExpandedRegion(.trailing) {
            VStack {
              Spacer()
              TimeInformation(vm: vm, placement: .dynamicIsland)
            }.padding(.trailing, 4).padding(.bottom, 4)
          }
          DynamicIslandExpandedRegion(.bottom) {
            RideInformationBar(vm: vm, placement: .dynamicIsland)
          }
        } compactLeading: {
          CompactLeadingView(vm: vm, tintColor: tintColor(context: context))
        } compactTrailing: {
          CompactTrailingView(vm: vm, tintColor: tintColor(context: context))
        } minimal: {
          CircularProgressView(vm: vm, content: .time, tintColor: tintColor(context: context))
        }
        .widgetURL(deepLinkURL(context.attributes.trainNumbers))
        .keylineTint(tintColor(context: context))
    }
  }
}

// The compact slots beside the camera cutout are only as wide as the system proposes, and
// the iPhone 18 Pro's narrower island (and any island limited in width, e.g. landscape on
// iOS 27) proposes far less than older models. Content that overflows the slot gets
// truncated to "…" and pushed against the rounded ends, so each compact view offers
// progressively narrower layouts and lets the system pick the first one that fits.
// The padding is part of the measured size, so it also holds in RTL layouts.

struct CompactLeadingView: View {
  var vm: ActivityViewModel
  var tintColor: Color

  var body: some View {
    ViewThatFits(in: .horizontal) {
      ring(size: 20).padding(.horizontal, 6)
      ring(size: 18).padding(.horizontal, 4)
      ring(size: 16).padding(.horizontal, 2)
    }
  }

  private func ring(size: CGFloat) -> some View {
    CircularProgressView(vm: vm, content: .icon, tintColor: tintColor)
      .frame(width: size, height: size)
  }
}

struct CompactTrailingView: View {
  var vm: ActivityViewModel
  var tintColor: Color

  private var endDate: Date { getStatusEndDate(context: vm.context) }

  var body: some View {
    ViewThatFits(in: .horizontal) {
      label(showUnit: true).padding(.horizontal, 6)
      label(showUnit: true).padding(.horizontal, 3)
      label(showUnit: false).padding(.horizontal, 3)
    }
    .lineLimit(1)
    .foregroundColor(tintColor)
  }

  @ViewBuilder
  private func label(showUnit: Bool) -> some View {
    if vm.isStale {
      Text(formatDateHour(endDate))
    } else {
      let minutes = String(getMinutesLeft(targetDate: endDate))
      Group {
        if showUnit {
          Text("\(minutes) min")
        } else {
          Text(minutes)
        }
      }
      .accessibilityLabel(vm.status == .waitForTrain ? "time left depart" : "time left arrival")
      .contentTransition(.numericText())
    }
  }
}

struct LiveActivity_Previews: PreviewProvider {
  static let attributes = BetterRailActivityAttributes(activityStartDate: Date(), route: Route(departureTime: "2023-06-09T14:08:00", arrivalTime: "2023-06-09T14:45:00", trains: [Train(trainNumber: 6039, orignStation: 2300, destinationStation: 2800, arrivalTime: "2023-06-09T14:36:00", departureTime: "2023-06-09T14:08:00", stopStations: [StopStation(stationId: 2500, platform: 1, arrivalTime: "2023-06-09T14:20:00", departureTime: "2023-06-09T14:20:00")], routeStations: [RouteStation(stationId: 1600, arrivalTime: "13:16", platform: 1), RouteStation(stationId: 1500, arrivalTime: "13:25", platform: 2), RouteStation(stationId: 1400, arrivalTime: "13:35", platform: 1), RouteStation(stationId: 700, arrivalTime: "13:39", platform: 1), RouteStation(stationId: 1300, arrivalTime: "13:43", platform: 1), RouteStation(stationId: 1220, arrivalTime: "13:47", platform: 1), RouteStation(stationId: 2100, arrivalTime: "13:56", platform: 1), RouteStation(stationId: 2200, arrivalTime: "14:01", platform: 2), RouteStation(stationId: 2300, arrivalTime: "14:08", platform: 2), RouteStation(stationId: 2500, arrivalTime: "14:20", platform: 1), RouteStation(stationId: 2800, arrivalTime: "14:36", platform: 1), RouteStation(stationId: 3500, arrivalTime: "15:02", platform: 5), RouteStation(stationId: 3600, arrivalTime: "15:10", platform: 2), RouteStation(stationId: 3700, arrivalTime: "15:15", platform: 3)], originPlatform: 2, destPlatform: 1, trainPosition: nil), Train(trainNumber: 6239, orignStation: 2800, destinationStation: 2820, arrivalTime: "2023-06-09T14:45:00", departureTime: "2023-06-09T14:41:00", stopStations: [], routeStations: [RouteStation(stationId: 2800, arrivalTime: "14:41", platform: 3), RouteStation(stationId: 2820, arrivalTime: "14:45", platform: 1), RouteStation(stationId: 3100, arrivalTime: "14:51", platform: 1), RouteStation(stationId: 3300, arrivalTime: "15:01", platform: 2), RouteStation(stationId: 3400, arrivalTime: "15:07", platform: 1), RouteStation(stationId: 3500, arrivalTime: "15:16", platform: 4), RouteStation(stationId: 3600, arrivalTime: "15:23", platform: 2), RouteStation(stationId: 3700, arrivalTime: "15:30", platform: 4), RouteStation(stationId: 4600, arrivalTime: "15:32", platform: 3), RouteStation(stationId: 4900, arrivalTime: "15:37", platform: 3), RouteStation(stationId: 4800, arrivalTime: "15:46", platform: 2), RouteStation(stationId: 5000, arrivalTime: "15:53", platform: 3), RouteStation(stationId: 5300, arrivalTime: "16:00", platform: 2), RouteStation(stationId: 5200, arrivalTime: "16:05", platform: 1)], originPlatform: 3, destPlatform: 1, trainPosition: nil)]), frequentPushesEnabled: true)
  static let contentState = BetterRailActivityAttributes.ContentState(delay: 2, nextStationId: 2800, status: .inTransit)

    static var previews: some View {
        attributes
            .previewContext(contentState, viewKind: .dynamicIsland(.compact))
            .previewDisplayName("Island Compact")
        attributes
            .previewContext(contentState, viewKind: .dynamicIsland(.expanded))
            .previewDisplayName("Island Expanded")
            .previewDevice("iPhone 14 Pro")

        attributes
            .previewContext(contentState, viewKind: .dynamicIsland(.minimal))
            .previewDisplayName("Minimal")
        attributes
          .previewContext(contentState, viewKind: .content)
          .previewDisplayName("Lock Screen")
          .previewDevice("iPhone 14 Pro")
          .environment(\.layoutDirection, .rightToLeft)
          .environment(\.locale, .init(identifier: "he"))
    }
}
