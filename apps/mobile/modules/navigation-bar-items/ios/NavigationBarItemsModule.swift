import ExpoModulesCore

struct NavigationBarItem: Record {
  @Field var id: String = ""
  @Field var title: String?
  @Field var systemImage: String?
  @Field var tintColor: UIColor?
  @Field var accessibilityLabel: String?
}

public class NavigationBarItemsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NavigationBarItems")

    View(NavigationBarItemsView.self) {
      Events("onItemPress")

      Prop("items") { (view: NavigationBarItemsView, items: [NavigationBarItem]) in
        view.items = items
      }
    }
  }
}
