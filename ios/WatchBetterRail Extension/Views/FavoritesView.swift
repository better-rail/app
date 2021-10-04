/**
  The main app screen which displays the favorite user train routes.
 */

import SwiftUI

struct FavoritesView: View {
  @ObservedObject var favorites: FavoritesViewModel
  
    var body: some View {
      VStack {
        List {
          ForEach (favorites.routes.sorted { $0.id < $1.id }) { route in
            let routesView = RoutesView(route: RouteViewModel(origin: route.origin, destination: route.destination))
            
            NavigationLink(destination: routesView) {
              FavoriteItemView(origin: route.origin, destination: route.destination)
            }
            .listRowBackground(ZStack {
              if let stationImage = route.origin.image {
                Image(stationImage).resizable()
                Rectangle().foregroundColor(Color(.sRGB, red: 0, green: 0, blue: 0, opacity: 0.45))
              } else {
                Rectangle().fill(Color("midnightBlue"))
              }
            }.cornerRadius(5))
          }
        }
        .listStyle(CarouselListStyle())
      }.navigationTitle("מועדפים")
    }
}

struct FavoritesView_Previews: PreviewProvider {
    static var previews: some View {
      let favoritesViewModel = FavoritesViewModel()
      favoritesViewModel.updateFavoriteRoutes(routes: ["0": "originId:3500,destinationId:8800", "1": "originId:3600,destinationId:3500"])
      return NavigationView {
        FavoritesView(favorites: favoritesViewModel)
    }
  }
}
