import ActivityKit
import WidgetKit
import SwiftUI

struct BetterRailLiveActivity: Widget {
    
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: BetterRailActivityAttributes.self) { context in
          // Lock screen/banner UI goes here
          LockScreenLiveActivityView(vm: ActivityViewModel(context: context))
            .padding()
            .background(Color(UIColor.systemBackground))

      } dynamicIsland: { context in
        let vm = ActivityViewModel(context: context)
        return DynamicIsland {
              // Expanded UI goes here.  Compose the expanded UI through
              // various regions, like leading/trailing/center/bottom
            DynamicIslandExpandedRegion(.leading, priority: 90.0) {
              LeadingView(vm: vm)
                .dynamicIsland(verticalPlacement: .belowIfTooWide)
            }
            DynamicIslandExpandedRegion(.trailing) {
                VStack {
                  Spacer()
                  TimeInformation(vm: vm, placement: .dynamicIsland)
                }
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
          
          .keylineTint(context.state.status.color)
      }
  }
}

struct LiveActivity_Previews: PreviewProvider {
  static let attributes = BetterRailActivityAttributes(activityStartDate: Date(), route: Route(departureTime: "2023-04-09T00:19:00", arrivalTime: "2023-04-09T01:29:00", trains: [Train(trainNumber: 123, orignStation: 3700, destinationStation: 3400, arrivalTime: "", departureTime: "", stopStations: [], routeStations: [RouteStation(stationId: 4600, arrivalTime: "20:50", platform: 4)], originPlatform: 4, destPlatform: 2)]), frequentPushesEnabled: true)
  static let contentState = BetterRailActivityAttributes.ContentState(delay: 2, nextStationId: 3700, status: .waitForTrain)

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
          .previewDevice("iPhone SE (3rd generation)")
          .environment(\.layoutDirection, .rightToLeft)
          .environment(\.locale, .init(identifier: "he"))
    }
}
