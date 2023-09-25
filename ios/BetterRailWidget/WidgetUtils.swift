import SwiftUI

func formatStationName(_ stationName: String, _ shouldTurnucate: Bool = true) -> String {
  shouldTurnucate ?
    stationName.turnucateTextAfterHyphen() :
    stationName
}

extension View {
  func widgetBackground(_ content: some View) -> some View {
    if #available(watchOSApplicationExtension 10.0, iOS 17.0, iOSApplicationExtension 17.0, macOSApplicationExtension 14.0, *) {
      return containerBackground(for: .widget) {
        content
      }
    } else {
      return background {
        content
      }
    }
  }
  
  func widgetBackground(_ color: Color) -> some View {
      if #available(watchOSApplicationExtension 10.0, iOSApplicationExtension 17.0, macOSApplicationExtension 14.0, *) {
          return containerBackground(color, for: .widget)
      } else {
          return background(color)
      }
  }
}

extension View {
    /// Applies the given transform if the given condition evaluates to `true`.
    /// - Parameters:
    ///   - condition: The condition to evaluate.
    ///   - transform: The transform to apply to the source `View`.
    /// - Returns: Either the original `View` or the modified `View` if the condition is `true`.
    @ViewBuilder func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}

extension WidgetConfiguration {
  func contentMarginsDisabledIfAvailable() -> some WidgetConfiguration {
    if #available(iOS 17.0, iOSApplicationExtension 17.0, macOSApplicationExtension 14.0, *) {
      return self.contentMarginsDisabled()
    } else {
      return self
    }
  }
}
