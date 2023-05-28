import SwiftUI

@main
struct WatchBetterRail: App {
    @SceneBuilder var body: some Scene {
        WindowGroup {
            NavigationView {
                MainView()
                  .environmentObject(UserInfo())
            }
        }
    }
}
