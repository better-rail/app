import ExpoModulesCore
import UIKit

/// One of an `ArrangementHostView`'s two panes. The host places it in its own view controller within the
/// arrangement; UIKit sizes that controller's view, and the pane hands the size to React.
final class ArrangementPaneView: ExpoView {
  var placement: ArrangementPlacement = .primary
  weak var host: ArrangementHostView?

  private(set) lazy var controller = ArrangementPaneController(pane: self)
  private var adoptedSize: CGSize?

  /// Lays the pane's React content out for the size the arrangement gives it.
  func adopt(size: CGSize) {
    guard size != adoptedSize, size.width > 0, size.height > 0 else { return }
    adoptedSize = size
    setViewSize(size)
  }
}

final class ArrangementPaneController: UIViewController {
  private weak var pane: ArrangementPaneView?

  init(pane: ArrangementPaneView) {
    self.pane = pane
    super.init(nibName: nil, bundle: nil)
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func loadView() {
    let view = UIView()
    view.backgroundColor = .clear
    self.view = view
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    guard let pane else { return }
    pane.adopt(size: view.bounds.size)
    pane.host?.paneDidLayout()
  }
}
