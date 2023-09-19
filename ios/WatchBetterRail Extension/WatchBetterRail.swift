import SwiftUI

@main
struct WatchBetterRail: App {
    @SceneBuilder var body: some Scene {
        WindowGroup {
          MainView(favorites: FavoritesViewModel())
        }
    }
}
