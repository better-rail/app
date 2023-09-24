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
    } else {
      WidgetEntryView(entry: entry)
    }
  }
}
