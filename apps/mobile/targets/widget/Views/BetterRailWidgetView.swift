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

  var isExtraLarge: Bool {
    #if os(iOS)
    if #available(iOS 27.0, *) { return widgetFamily == .systemExtraLargePortrait }
    #endif
    return false
  }

  var body: some View {
    if accessoryWidgetFamilies.contains(widgetFamily) {
      AccessoryEntryView(entry: entry)
        .widgetURL(URL(string: "widget://route?originId=\(entry.origin.id)&destinationId=\(entry.destination.id)")!)
    } else {
      #if os(watchOS)
        EmptyView()
      #else
      Group {
        if isExtraLarge {
          WidgetExtraLargeView(entry: entry)
        } else {
          WidgetEntryView(entry: entry)
        }
      }
      .widgetURL(URL(string: "widget://route?originId=\(entry.origin.id)&destinationId=\(entry.destination.id)")!)
      #endif
    }
  }
}
