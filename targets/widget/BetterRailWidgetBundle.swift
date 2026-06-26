import WidgetKit
import SwiftUI

@main
struct BetterRailWidgetBundle: WidgetBundle {
  var body: some Widget {
      BetterRailWidget()
      
    #if canImport(ActivityKit)
      if #available(iOS 16.2, *) {
        BetterRailLiveActivity()
      }
    #endif
  }
}
