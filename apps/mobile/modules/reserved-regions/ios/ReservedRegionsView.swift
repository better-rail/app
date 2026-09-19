import ExpoModulesCore
import UIKit

/// A container that reports the active division regions within its bounds — the fold of iPhone Duo's inner display
/// while it's partially open — so JavaScript can lay its children out on either side of it.
final class ReservedRegionsView: ExpoView {
  let onDivisionsChange = EventDispatcher()

  private var reportedDivisions: [CGRect]?
  private var hingePartiallyOpen = false

  /// Room either side of a stand-in fold line, as a real division region includes margins for interactive content.
  private static let fallbackFoldWidth: CGFloat = 32

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    // The fold's division region follows the hinge, but folding doesn't resize the view, so layout alone may never
    // re-read it. The hinge is the signal to query the region again; its status only feeds `fallbackFold()`.
    if let interaction = BRFoldRegions.hingeInteraction(handler: { [weak self] partiallyOpen in
      self?.hingePartiallyOpen = partiallyOpen
      self?.reportDivisions()
      // The region can settle after the hinge update that caused it, so read it again on the next turn.
      DispatchQueue.main.async { self?.reportDivisions() }
    }) {
      addInteraction(interaction)
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    reportDivisions()
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil else { return }
    // Events sent before JavaScript attaches its listener are dropped, so report again once mounted.
    reportedDivisions = nil
    DispatchQueue.main.async { [weak self] in self?.reportDivisions() }
  }

  private func reportDivisions() {
    guard window != nil else { return }
    var divisions = BRFoldRegions.activeDivisionFrames(in: self).map(\.cgRectValue)
    if divisions.isEmpty, let fold = fallbackFold() { divisions = [fold] }
    guard divisions != reportedDivisions else { return }
    reportedDivisions = divisions
    onDivisionsChange([
      "divisions": divisions.map { ["x": $0.minX, "y": $0.minY, "width": $0.width, "height": $0.height] }
    ])
  }

  /// FALLBACK — used only while the hinge is partially open but the system reports no division region, which is
  /// the case for third-party apps on the iOS 27.1 simulator (24A94401) even though system apps follow the fold.
  /// iPhone Duo's fold runs along the middle of the inner display, perpendicular to its longer side, so stand in a
  /// region on that line, in this view's coordinates. A reported region always takes precedence.
  private func fallbackFold() -> CGRect? {
    guard hingePartiallyOpen, let screen = window?.windowScene?.screen else { return nil }
    let screenBounds = screen.bounds
    let width = Self.fallbackFoldWidth
    let foldInScreen = screenBounds.width >= screenBounds.height
      ? CGRect(x: screenBounds.midX - width / 2, y: screenBounds.minY, width: width, height: screenBounds.height)
      : CGRect(x: screenBounds.minX, y: screenBounds.midY - width / 2, width: screenBounds.width, height: width)
    let fold = convert(foldInScreen, from: screen.coordinateSpace).intersection(bounds)
    return fold.isNull || fold.isEmpty ? nil : fold
  }
}
