import WidgetKit
import SwiftUI

let snapshotEntry = TrainDetail(
  date: Date(),
  departureTime: "09:43",
  arrivalTime: "09:42",
  platform: "3",
  trainNumber: "141"
)

let emptyEntry = TrainDetail(
  date: Date(),
  departureTime: "404",
  arrivalTime: "404",
  platform: "404",
  trainNumber: "404"
)

//let currentDate = Date()

//let sampleEntry1 = TrainDetail(
//  date: currentDate,
//  departureTime: "15:20",
//  arrivalTime: "11:11",
//  platform: "3",
//  trainNumber: "131"
//)
//
//
//let sampleEntry2 = TrainDetail(
//  date: Calendar.current.date(byAdding: .minute, value: 1, to: currentDate)!,
//  departureTime: "15:40",
//  arrivalTime: "11:11",
//  platform: "3",
//  trainNumber: "131"
//)
//


struct Provider: TimelineProvider {
  typealias Entry = TrainDetail
  
  func placeholder(in context: Context) -> Entry {
      snapshotEntry
  }

  func getSnapshot(in context: Context, completion: @escaping (TrainDetail) -> ()) {
      completion(snapshotEntry)
  }
  
  func getTrains(completion: @escaping (_ entries: [Entry]) -> Void) {
    var entries: [Entry] = []
    
    RouteModel().fetchRoute(originId: "4600", destinationId: "680", completion: { result in
      
      if let response = try? result.get() {
        if (response.data.routes.count == 0) {
          // No trains found
          entries.append(emptyEntry)
        }
        
        else {
            for
              index in 0 ..< response.data.routes.count
            where
              // API possibly return past trains
              Date() < stringToDate(response.data.routes[index].train[0].departureTime)!
            {
            let trains = response.data.routes[index].train
            let firstTrain = trains[0]
            let lastTrain = trains[trains.count - 1]

            var date: Date
            if (index == 0) {
              // First entry shows up right away
              date = Date()
            } else {
              // Later entries will show up 1 minute after the last entry
              let previousTrain = response.data.routes[index - 1].train[0]
              let lastDepartureDate = stringToDate(previousTrain.departureTime)!
              
              date = Calendar.current.date(byAdding: .minute, value: 1, to: lastDepartureDate)!
            }
            
            
            let entry = Entry(
              date: date,
              departureTime: firstTrain.formattedDepartureTime,
              arrivalTime: lastTrain.formattedArrivalTime,
              platform: firstTrain.platform,
              trainNumber: firstTrain.trainno
            )

            entries.append(entry)
          }
        }
      
        completion(entries)
      }
    })
  }
                              
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    getTrains(completion: { entries in
      // Refresh timeline after tomorrow at midnight
      let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: Date())!
      let midnight = Calendar.current.startOfDay(for: tomorrow)
      
      let timeline = Timeline(entries: entries, policy: .after(midnight))
      completion(timeline)
    })
  }
}

@main
struct BetterRailWidget: Widget {
    let kind: String = "BetterRailWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(
          kind: kind,
          provider: Provider())
          { entry in
          WidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Scheduale")
        .description("Display the upcoming train times.")
        .supportedFamilies([.systemSmall])
    }
}

struct BetterRailWidget_Previews: PreviewProvider {
    static var previews: some View {
      WidgetEntryView(entry: snapshotEntry)
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
