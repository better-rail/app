import WidgetKit
import SwiftUI

let snapshotEntry = TrainDetail(
  date: Date(),
  departureTime: "09:43",
  arrivalTime: "09:42",
  platform: "3",
  trainNumber: "141"
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
    
    RouteModel().fetchRoute(originId: "680", destinationId: "3700", completion: { result in
      
      if let response = try? result.get() {
        if (response.data.routes.count == 0) {
          // No trains found
          entries.append(TrainDetail(date: Date(), departureTime: "404", arrivalTime: "404", platform: "404", trainNumber: "404"))
        }
        
        else {
          for index in 0 ..< response.data.routes.count {
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
      let timeline = Timeline(entries: entries, policy: .atEnd)
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
