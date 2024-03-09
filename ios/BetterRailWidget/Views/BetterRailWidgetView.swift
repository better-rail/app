import WidgetKit
import SwiftUI

#if os(watchOS)
let accessoryWidgetFamilies: [WidgetFamily] = [.accessoryCorner, .accessoryCircular, .accessoryInline, .accessoryRectangular]
#else
let accessoryWidgetFamilies: [WidgetFamily] = [.accessoryCircular, .accessoryInline, .accessoryRectangular]
#endif

struct BetterRailWidgetView: View {
  var entry: TrainDetail
  @Environment(\.widgetFamily) var widgetFamily
  
  var body: some View {
    if accessoryWidgetFamilies.contains(widgetFamily) {
      AccessoryEntryView(entry: entry)
        .widgetURL(URL(string: "widget://route?originId=\(entry.origin.id)&destinationId=\(entry.destination.id)")!)
    } else {
      #if os(watchOS)
        EmptyView()
      #else
      WidgetEntryView(entry: entry)
        .widgetURL(URL(string: "widget://route?originId=\(entry.origin.id)&destinationId=\(entry.destination.id)")!)
      #endif
    }
  }
}
