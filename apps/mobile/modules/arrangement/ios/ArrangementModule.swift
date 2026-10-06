import ExpoModulesCore

public class ArrangementModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Arrangement")

    Constant("isAvailable") { ArrangementBridge.isAvailable }

    View(ArrangementHostView.self) {
      Events("onArrangementChange")

      Prop("primaryWidth") { (view: ArrangementHostView, width: [String: Double]?) in
        view.primaryWidth = ArrangementPaneWidth(width)
      }

      Prop("secondaryWidth") { (view: ArrangementHostView, width: [String: Double]?) in
        view.secondaryWidth = ArrangementPaneWidth(width)
      }

      OnViewDidUpdateProps { (view: ArrangementHostView) in
        view.applyArrangementIfNeeded()
      }
    }

    View(ArrangementPaneView.self) {
      Prop("placement") { (view: ArrangementPaneView, placement: String) in
        view.placement = placement == "secondary" ? .secondary : .primary
      }
    }
  }
}

extension ArrangementPaneWidth {
  /// Unset dimensions are left to the system.
  init(_ width: [String: Double]?) {
    self.init(
      minimum: CGFloat(width?["minimum"] ?? -1),
      preferred: CGFloat(width?["preferred"] ?? -1),
      maximum: CGFloat(width?["maximum"] ?? -1),
      layoutPriority: CGFloat(width?["layoutPriority"] ?? -1)
    )
  }

  func isSame(as other: ArrangementPaneWidth) -> Bool {
    minimum == other.minimum && preferred == other.preferred && maximum == other.maximum
      && layoutPriority == other.layoutPriority
  }
}
