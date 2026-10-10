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

  // Matches RNBetterRail.getInstalledWidgets
  var familyName: String {
    if isExtraLarge { return "extraLargePortrait" }
    switch widgetFamily {
    case .systemSmall: return "small"
    case .systemMedium: return "medium"
    case .systemLarge: return "large"
    case .accessoryCircular: return "accessoryCircular"
    case .accessoryInline: return "accessoryInline"
    case .accessoryRectangular: return "accessoryRectangular"
    default: return "unknown"
    }
  }

  var deepLinkURL: URL {
    URL(string: "widget://route?originId=\(entry.origin.id)&destinationId=\(entry.destination.id)&family=\(familyName)")!
  }

  var body: some View {
    if accessoryWidgetFamilies.contains(widgetFamily) {
      AccessoryEntryView(entry: entry)
        .widgetURL(deepLinkURL)
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
      .widgetURL(deepLinkURL)
      #endif
    }
  }
}
