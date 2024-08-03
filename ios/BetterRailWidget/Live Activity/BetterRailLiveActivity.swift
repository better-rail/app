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
      .applySupplementalFamilies()
  }
}

//
struct LiveActivity_Previews: PreviewProvider {
  static let attributes = previewLiveActivityAttributes
  static let contentState = previewContentState

    static var previews: some View {
        attributes
        .previewContext(contentState, viewKind: .dynamicIsland(.compact))
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

extension ActivityConfiguration {
  func applySupplementalFamilies() -> some WidgetConfiguration {
    if #available(iOS 18, *) {
      // Support live activity on the Apple Watch
      return self.supplementalActivityFamilies([.small])
    } else {
      return self
    }
  }
}
