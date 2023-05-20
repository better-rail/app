import ActivityKit
import WidgetKit
import SwiftUI


struct BetterRailLiveActivity: Widget {
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
            // Expanded UI goes here.  Compose the expanded UI through
            // various regions, like leading/trailing/center/bottom
          DynamicIslandExpandedRegion(.leading) {
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
          CircularProgressView(vm: vm)
        } compactTrailing: {
          Text("\(String(getMinutesLeft(targetDate: getStatusEndDate(context: context)))) min")
            .foregroundColor(vm.status.color)
        } minimal: {
          CircularProgressView(vm: vm)
        }
        .widgetURL(deepLinkURL(context.attributes.trainNumbers))
        .keylineTint(context.state.status.color)
    }
  }
}

struct LiveActivity_Previews: PreviewProvider {
  static let attributes = BetterRailActivityAttributes(activityStartDate: Date(), route: Route(departureTime: "2023-04-09T00:19:00", arrivalTime: "2023-04-09T01:29:00", trains: [Train(trainNumber: 123, orignStation: 3700, destinationStation: 3400, arrivalTime: "", departureTime: "", stopStations: [], routeStations: [RouteStation(stationId: 4600, arrivalTime: "20:50", platform: 4)], originPlatform: 4, destPlatform: 2)]), frequentPushesEnabled: true)
  static let contentState = BetterRailActivityAttributes.ContentState(delay: 2, nextStationId: 3700, status: .inTransit)

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
