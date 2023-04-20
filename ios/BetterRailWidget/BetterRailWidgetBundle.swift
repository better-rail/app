import WidgetKit
import SwiftUI

@main
struct BetterRailWidgetBundle: WidgetBundle {
  var body: some Widget {
      BetterRailWidget()
              
      if #available(iOS 16.2, *) {
        BetterRailLiveActivity()
      }
  }
}
