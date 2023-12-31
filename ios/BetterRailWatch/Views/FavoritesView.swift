/**
  The main app screen which displays the favorite user train routes.
 */

import SwiftUI

struct FavoritesView: View {
  @ObservedObject var favorites: FavoritesViewModel
  
    var body: some View {
      if !favorites.routes.isEmpty {
        ForEach(favorites.routes) { route in
          let routesView = RoutesView(route: RouteViewModel(origin: route.origin, destination: route.destination)).navigationTitle("Schedule")
          
          NavigationLink(destination: routesView) {
            FavoriteListItemView(route: route)
          }
          .listRowBackground(StationImageBackground(route.origin.image).cornerRadius(18))
          .tag(route)
        }
      } else {
        emptyPlaceholder
      }
    }
  
  var emptyPlaceholder: some View =
  HStack {
    Spacer()
    VStack(alignment: .center) {
      Image(systemName: "star.fill").padding(.vertical, 2.0).font(.system(size: 32))
      Text("no-favorites").font(.headline)
      Text("no-favorites-message")
        .font(.footnote)
        .foregroundColor(.gray)
        .multilineTextAlignment(.center)
    }
    .padding(.vertical, 8.0)
    Spacer()
  }
  .listRowBackground(
    Color(.darkGray)
      .clipped()
      .cornerRadius(10)
  )
}

struct FavoritesView_Previews: PreviewProvider {
    static var previews: some View {
      let favoritesViewModel = FavoritesViewModel()
      favoritesViewModel.updateFavoriteRoutes(routes: ["0": "originId:680,destinationId:8800", "1": "originId:3600,destinationId:680", "2": "originId:3500,destinationId:3700"])
      return NavigationView {
        FavoritesView(favorites: favoritesViewModel)
    }
  }
}
