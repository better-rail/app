import SwiftUI
import Firebase
import FirebaseAuth
import RevenueCat

@main
struct WatchBetterRail: App {
  init() {
    FirebaseApp.configure()
    do {
      try Auth.auth().useUserAccessGroup("UE6BVYPPFX.group.il.co.better-rail")
      Purchases.configure(
        with: Configuration.Builder(withAPIKey: "appl_pOArhScpRECBNsNeIwfRCkYlsfZ")
          .with(appUserID: Auth.auth().currentUser?.uid)
          .with(userDefaults: .init(suiteName: "group.il.co.better-rail") ?? .standard)
          .build()
      )
    } catch {
      print("Error changing user access group: %@", error)
    }
  }
  
    @SceneBuilder var body: some Scene {
        WindowGroup {
            NavigationView {
                MainView()
                  .environmentObject(UserInfo())
            }
        }
    }
}
