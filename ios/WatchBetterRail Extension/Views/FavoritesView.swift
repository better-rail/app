/**
  The main app screen which displays the favorite user train routes.
 */

import SwiftUI

struct FavoritesView: View {
  @ObservedObject var favorites: FavoritesViewModel
  
    var body: some View {
      if (favorites.routes.count > 0) {
        ForEach (favorites.routes.sorted { $0.id < $1.id }) { route in
          let routesView = RoutesView(route: RouteViewModel(origin: route.origin, destination: route.destination))
          
          NavigationLink(destination: routesView) {
            FavoriteItemView(origin: route.origin, destination: route.destination)
          }
          .listRowBackground(StationImageBackground(route.origin.image))
        }
      } else {
        emptyPlaceholder
      }
    }
  
  var emptyPlaceholder: some View = VStack(alignment: /*@START_MENU_TOKEN@*/.center/*@END_MENU_TOKEN@*/) {
    Image(systemName: "star.fill").padding(.vertical, 2.0).font(.system(size: 32))
    Text("no-favorites").font(.headline)
    Text("no-favorites-message")
      .font(.footnote)
      .foregroundColor(.gray)
      .multilineTextAlignment(.center)
  }
}

struct FavoritesView_Previews: PreviewProvider {
    static var previews: some View {
      let favoritesViewModel = FavoritesViewModel()
      favoritesViewModel.updateFavoriteRoutes(routes: ["0": "originId:680,destinationId:8800", "1": "originId:3600,destinationId:680"])
      return NavigationView {
        FavoritesView(favorites: favoritesViewModel)
    }
  }
}
