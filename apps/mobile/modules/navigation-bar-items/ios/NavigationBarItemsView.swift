import ExpoModulesCore
import UIKit

/// Puts its items in the trailing side of the navigation bar of the view controller it's rendered in,
/// for screens with no native stack header, like a split view's sidebar column.
class NavigationBarItemsView: ExpoView {
  let onItemPress = EventDispatcher()
  private weak var hostController: UIViewController?

  var items: [NavigationBarItem] = [] {
    didSet { applyItems() }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isUserInteractionEnabled = false
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()

    if window == nil {
      hostController?.navigationItem.rightBarButtonItems = nil
      hostController = nil
    } else {
      hostController = findHostController()
      applyItems()
    }
  }

  private func findHostController() -> UIViewController? {
    var responder: UIResponder? = self
    while let current = responder {
      if let controller = current as? UIViewController, controller.parent is UINavigationController {
        return controller
      }
      responder = current.next
    }
    return nil
  }

  private func applyItems() {
    // rightBarButtonItems run from the trailing edge inwards
    hostController?.navigationItem.rightBarButtonItems = items.reversed().map(makeBarButtonItem)
  }

  private func makeBarButtonItem(_ item: NavigationBarItem) -> UIBarButtonItem {
    let image = item.systemImage.flatMap { UIImage(systemName: $0) }
    let action = UIAction { [weak self] _ in
      self?.onItemPress(["id": item.id])
    }
    let barButtonItem: UIBarButtonItem
    if let title = item.title, let image {
      // A bar button item shows only its image when it has both, so these are a tinted glass pill button
      var configuration: UIButton.Configuration
      if #available(iOS 26.0, *) {
        configuration = .prominentGlass()
      } else {
        configuration = .filled()
        configuration.baseBackgroundColor = item.tintColor
      }
      configuration.cornerStyle = .capsule
      configuration.baseForegroundColor = .white
      // The bar overrides a custom view's image tint, so the color goes into the image
      configuration.image = image.withTintColor(.white, renderingMode: .alwaysOriginal)
      configuration.title = title
      // Sized like the planner's old in-content "New" chip, in the app's Heebo Medium
      configuration.imagePadding = 8
      configuration.contentInsets = NSDirectionalEdgeInsets(top: 4, leading: 12, bottom: 4, trailing: 12)
      configuration.preferredSymbolConfigurationForImage = UIImage.SymbolConfiguration(pointSize: 13, weight: .medium)
      configuration.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attributes in
        var attributes = attributes
        let font = UIFont(name: "Heebo-Medium", size: 16) ?? .systemFont(ofSize: 16, weight: .medium)
        attributes.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: font)
        return attributes
      }
      let button = UIButton(configuration: configuration, primaryAction: action)
      // Prominent glass takes its color from the tint
      button.tintColor = item.tintColor
      barButtonItem = UIBarButtonItem(customView: button)
    } else {
      barButtonItem = UIBarButtonItem(title: item.title, image: image, primaryAction: action)
      barButtonItem.tintColor = item.tintColor
    }
    barButtonItem.accessibilityLabel = item.accessibilityLabel ?? item.title

    if #available(iOS 26.0, *) {
      // Plain buttons, without the glass capsule
      barButtonItem.hidesSharedBackground = true
    }

    return barButtonItem
  }
}
