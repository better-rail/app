import Foundation
import WidgetKit
import SwiftUI

struct Provider: IntentTimelineProvider {
  typealias Entry = TrainDetail

  func placeholder(in context: Context) -> Entry { snapshotEntry }

  func getSnapshot(for configuration: RouteIntent, in context: Context, completion: @escaping (TrainDetail) -> ()) {
    completion(snapshotEntry)
  }


  func getTimeline(for configuration: RouteIntent, in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    let entriesGenerator = EntriesGenerator()
    
    if let originId = configuration.origin?.identifier,
       let destinationId = configuration.destination?.identifier {

      Task {
        async let todayRoutes = RouteModel().fetchRoute(originId: originId, destinationId: destinationId)
        
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        async let tomorrowRoutes = RouteModel().fetchRoute(originId: originId, destinationId: destinationId, date: tomorrow)

        let routes = (today: await todayRoutes, tomorrow: await tomorrowRoutes)
        
        if routes.today.status == .failed {
          // something went wrong, try to refetch in 30 minutes
          let emptyEntry = entriesGenerator.getEmptyEntry(originId: Int(originId)!, destinationId: Int(destinationId)!, errorCode: 404)
          let retryTime = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
          let timeline = Timeline(entries: [emptyEntry], policy: .after(retryTime))
          completion(timeline)
        } else {
          let entries = await entriesGenerator.getTrains(todayRoutes: routes.today.routes!, tomorrowRoutes: routes.tomorrow.routes!)
          
          // Refresh widget after tomorrow at midnight
          let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date())!
          let midnight = Calendar.current.startOfDay(for: tomorrow)
          
          // Delay the reload a little to ensure the request will be sent after midnight
          let midnightDelayed = Calendar.current.date(byAdding: .minute, value: 5, to: midnight)!

          let timeline = Timeline(entries: entries, policy: .after(midnightDelayed))
          completion(timeline)
        }
      }
    }
  }
}

struct BetterRailWidget: Widget {
    let kind: String = "BetterRailWidget"

    var body: some WidgetConfiguration {
        IntentConfiguration(
          kind: kind,
          intent: RouteIntent.self,
          provider: Provider())
          { entry in
          BetterRailWidgetView(entry: entry)
        }
        .configurationDisplayName("Schedule")
        .description("Display the upcoming train times.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabledIfAvailable()
    }
}

struct BetterRailWidget_Previews: PreviewProvider {
    static var previews: some View {
      BetterRailWidgetView(entry: snapshotEntry)
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
