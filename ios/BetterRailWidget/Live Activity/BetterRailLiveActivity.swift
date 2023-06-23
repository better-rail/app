import ActivityKit
import WidgetKit
import SwiftUI


struct BetterRailLiveActivity: Widget {
  func tintColor(context: ActivityViewContext<BetterRailActivityAttributes>) -> Color {
    return context.state.delay >= 5 ? .red : context.state.status.color
  }
  
  func deepLinkURL(_ trainNumbers: [Int]) -> URL {
    // convert train numbers to be used as a URL parameter
    let urlParam = trainNumbers.map(String.init).joined(separator: ",")
    return URL(string: "liveActivity://?trains=\(urlParam)")!
  }
  
  var body: some WidgetConfiguration {
      ActivityConfiguration(for: BetterRailActivityAttributes.self) { context in
        // Lock screen/banner UI goes here
        LockScreenLiveActivityView(vm: ActivityViewModel(context: context))
          .padding()
          .background(Color(UIColor.systemBackground))
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
          CircularProgressView(vm: vm, content: .icon, tintColor: tintColor(context: context))
        } compactTrailing: {
          let endDate = getStatusEndDate(context: context)
          
          if (vm.isStale) {
            Text(formatDateHour(endDate))
              .foregroundColor(tintColor(context: context))
          } else {
            Text("\(String(getMinutesLeft(targetDate: endDate))) min")
              .foregroundColor(tintColor(context: context))
              .accessibilityLabel(vm.status == .waitForTrain ? "time left depart" : "time left arrival")
              .contentTransition(.numericText())
          }
        } minimal: {
          CircularProgressView(vm: vm, content: .time, tintColor: tintColor(context: context))
        }
        .widgetURL(deepLinkURL(context.attributes.trainNumbers))
        .keylineTint(tintColor(context: context))
    }
  }
}

struct LiveActivity_Previews: PreviewProvider {
  static let attributes = BetterRailActivityAttributes(activityStartDate: Date(), route: Route(departureTime: "2023-06-09T14:08:00", arrivalTime: "2023-06-09T14:45:00", trains: [Train(delay: IntWithDefaultValue(wrappedValue: 0), trainNumber: 6039, orignStation: 2300, destinationStation: 2800, arrivalTime: "2023-06-09T14:36:00", departureTime: "2023-06-09T14:08:00", stopStations: [StopStation(stationId: 2500, platform: 1, arrivalTime: "2023-06-09T14:20:00", departureTime: "2023-06-09T14:20:00")], routeStations: [RouteStation(stationId: 1600, arrivalTime: "13:16", platform: 1), RouteStation(stationId: 1500, arrivalTime: "13:25", platform: 2), RouteStation(stationId: 1400, arrivalTime: "13:35", platform: 1), RouteStation(stationId: 700, arrivalTime: "13:39", platform: 1), RouteStation(stationId: 1300, arrivalTime: "13:43", platform: 1), RouteStation(stationId: 1220, arrivalTime: "13:47", platform: 1), RouteStation(stationId: 2100, arrivalTime: "13:56", platform: 1), RouteStation(stationId: 2200, arrivalTime: "14:01", platform: 2), RouteStation(stationId: 2300, arrivalTime: "14:08", platform: 2), RouteStation(stationId: 2500, arrivalTime: "14:20", platform: 1), RouteStation(stationId: 2800, arrivalTime: "14:36", platform: 1), RouteStation(stationId: 3500, arrivalTime: "15:02", platform: 5), RouteStation(stationId: 3600, arrivalTime: "15:10", platform: 2), RouteStation(stationId: 3700, arrivalTime: "15:15", platform: 3)], originPlatform: 2, destPlatform: 1), Train(delay: IntWithDefaultValue(wrappedValue: 0), trainNumber: 6239, orignStation: 2800, destinationStation: 2820, arrivalTime: "2023-06-09T14:45:00", departureTime: "2023-06-09T14:41:00", stopStations: [], routeStations: [RouteStation(stationId: 2800, arrivalTime: "14:41", platform: 3), RouteStation(stationId: 2820, arrivalTime: "14:45", platform: 1), RouteStation(stationId: 3100, arrivalTime: "14:51", platform: 1), RouteStation(stationId: 3300, arrivalTime: "15:01", platform: 2), RouteStation(stationId: 3400, arrivalTime: "15:07", platform: 1), RouteStation(stationId: 3500, arrivalTime: "15:16", platform: 4), RouteStation(stationId: 3600, arrivalTime: "15:23", platform: 2), RouteStation(stationId: 3700, arrivalTime: "15:30", platform: 4), RouteStation(stationId: 4600, arrivalTime: "15:32", platform: 3), RouteStation(stationId: 4900, arrivalTime: "15:37", platform: 3), RouteStation(stationId: 4800, arrivalTime: "15:46", platform: 2), RouteStation(stationId: 5000, arrivalTime: "15:53", platform: 3), RouteStation(stationId: 5300, arrivalTime: "16:00", platform: 2), RouteStation(stationId: 5200, arrivalTime: "16:05", platform: 1)], originPlatform: 3, destPlatform: 1)]), frequentPushesEnabled: true)
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
