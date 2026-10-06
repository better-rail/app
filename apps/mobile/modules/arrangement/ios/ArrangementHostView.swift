import ExpoModulesCore
import UIKit

/// Hosts two React panes in a `UIArrangementViewController`, so UIKit lays them out — side by side, around iPhone
/// Duo's fold when it's partially open, or the primary alone without room for both — and animates between those
/// layouts as the device opens, folds or closes, as system apps do. Each pane takes the frame UIKit gives it and
/// passes its size on to React, which lays the pane's content out for it.
///
/// Before iOS 27.1 there's no arrangement controller; the panes then mount as plain subviews, and JavaScript is
/// expected to lay them out itself (see `isAvailable` in the module).
final class ArrangementHostView: ExpoView {
  let onArrangementChange = EventDispatcher()

  var primaryWidth = ArrangementPaneWidth(-1)
  var secondaryWidth = ArrangementPaneWidth(-1)

  private let arrangementController = ArrangementBridge.makeArrangementViewController()
  private var panes: [ArrangementPlacement: ArrangementPaneView] = [:]
  private var appliedWidths: (primary: ArrangementPaneWidth, secondary: ArrangementPaneWidth)?
  private var reportedLayout: NSDictionary?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    if let view = arrangementController?.view {
      view.backgroundColor = .clear
      addSubview(view)
    }
  }

  // MARK: - Panes

  override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard let arrangementController, let pane = childComponentView as? ArrangementPaneView else {
      super.mountChildComponentView(childComponentView, index: index)
      return
    }
    pane.host = self
    panes[pane.placement] = pane
    pane.controller.view.addSubview(pane)
    ArrangementBridge.setViewController(pane.controller, for: pane.placement, in: arrangementController)
  }

  override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    guard let arrangementController, let pane = childComponentView as? ArrangementPaneView else {
      super.unmountChildComponentView(childComponentView, index: index)
      return
    }
    if panes[pane.placement] === pane {
      panes[pane.placement] = nil
      ArrangementBridge.setViewController(nil, for: pane.placement, in: arrangementController)
    }
    pane.host = nil
    pane.removeFromSuperview()
  }

  // MARK: - Arrangement

  func applyArrangementIfNeeded() {
    guard let arrangementController else { return }
    if let appliedWidths, appliedWidths.primary.isSame(as: primaryWidth), appliedWidths.secondary.isSame(as: secondaryWidth) {
      return
    }
    // Changes after the first layout come from React, while the screen is up, so let UIKit animate them too.
    let animated = appliedWidths != nil && window != nil
    appliedWidths = (primaryWidth, secondaryWidth)
    ArrangementBridge.applyHorizontalSplit(
      to: arrangementController,
      primaryWidth: primaryWidth,
      secondaryWidth: secondaryWidth,
      animated: animated
    )
  }

  /// Called by a pane whenever UIKit lays it out, including inside the animation of an arrangement change.
  func paneDidLayout() {
    reportLayout()
  }

  /// Tells JavaScript which panes the arrangement shows and where, in this view's coordinates, so screens can line
  /// other content up with them and know whether the secondary pane is on screen.
  private func reportLayout() {
    guard let arrangementController else { return }
    let layout = NSMutableDictionary()
    layout["secondaryHidden"] = ArrangementBridge.isHidden(.secondary, in: arrangementController)
    for (placement, key) in [(ArrangementPlacement.primary, "primary"), (.secondary, "secondary")] {
      guard
        let pane = panes[placement],
        !ArrangementBridge.isHidden(placement, in: arrangementController),
        let paneView = pane.controller.viewIfLoaded,
        paneView.window != nil
      else { continue }
      let frame = paneView.convert(paneView.bounds, to: self)
      layout[key] = ["x": frame.minX, "y": frame.minY, "width": frame.width, "height": frame.height]
    }
    guard reportedLayout != layout else { return }
    reportedLayout = layout.copy() as? NSDictionary
    onArrangementChange(layout as? [String: Any] ?? [:])
  }

  // MARK: - View controller containment

  override func layoutSubviews() {
    super.layoutSubviews()
    arrangementController?.view.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard let arrangementController, window != nil, arrangementController.parent == nil,
      let parentController = reactViewController()
    else { return }
    // As Expo's SwiftUI host does: navigation and tab bar controllers only take screens and tabs as children.
    if !(parentController is UINavigationController) && !(parentController is UITabBarController) {
      parentController.addChild(arrangementController)
    }
    if arrangementController.view.superview !== self {
      addSubview(arrangementController.view)
    }
    arrangementController.didMove(toParent: parentController)
    applyArrangementIfNeeded()
    // Events sent before JavaScript attaches its listener are dropped, so report again once mounted.
    reportedLayout = nil
    DispatchQueue.main.async { [weak self] in self?.reportLayout() }
  }

  override func willMove(toSuperview newSuperview: UIView?) {
    super.willMove(toSuperview: newSuperview)
    guard newSuperview == nil, let arrangementController, arrangementController.parent != nil else { return }
    arrangementController.willMove(toParent: nil)
    arrangementController.removeFromParent()
  }
}

extension ArrangementPaneWidth {
  init(_ unset: CGFloat) {
    self.init(minimum: unset, preferred: unset, maximum: unset, layoutPriority: unset)
  }
}
