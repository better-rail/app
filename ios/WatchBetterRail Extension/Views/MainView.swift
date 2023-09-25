import SwiftUI

struct MainView: View {
  @ObservedObject var favorites: FavoritesViewModel
  
  @State var selected: FavoriteRoute?
  
  var body: some View {
    if #available(watchOSApplicationExtension 10.0, *), !favorites.routes.isEmpty {
      NavigationSplitView {
        List(selection: $selected) {
          ForEach(favorites.routes) { route in
            FavoriteListItemView(origin: route.origin, destination: route.destination)
              .tag(route)
          }
        }
        .navigationTitle("Better Rail")
      } detail: {
        TabView(selection: $selected) {
          ForEach(favorites.routes) { route in
            NavigationStack {
              NavigationLink(destination: {
                RoutesView(route: RouteViewModel(origin: route.origin, destination: route.destination))
              }, label: {
                FavoriteRouteView(route: RouteViewModel(origin: route.origin, destination: route.destination))
              })
              .buttonStyle(PlainButtonStyle())
              .edgesIgnoringSafeArea(.bottom)
              .background(
                LinearGradient(colors: [.blue, .clear], startPoint: .bottom, endPoint: .top)
                  .opacity(0.25)
              )
              .containerBackground(for: .tabView) {
                StationImageBackground(route.origin.image, isFullScreen: true)
              }
            }
            .tag(Optional(route))
          }
        }
        .tabViewStyle(.verticalPage)
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            NavigationLink(destination: SearchView(), label: {
              Image(systemName: "magnifyingglass")
            })
          }
        }
      }
      .onOpenURL { url in
        if url.host == "route",
           let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let originId = components.queryItems?.first(where: { $0.name == "originId" })?.value,
           let destinationId = components.queryItems?.first(where: { $0.name == "destinationId" })?.value,
           let selectedRoute = favorites.routes.first(where: { $0.origin.id == originId && $0.destination.id == destinationId }) {
          self.selected = selectedRoute
        }
      }
    } else {
      NavigationView {
        VStack {
          List {
            FavoritesView(favorites: favorites)
            
            NavigationLink(destination: SearchView()) {
              HStack(alignment: .center) {
                VStack {
                  Text("search route")
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                }
              }
            }.frame(idealHeight: 75)
              .listRowBackground(
                Color("midnightBlue")
                  .clipped()
                  .cornerRadius(10)
              )
            
          }
          .listStyle(CarouselListStyle())
        }
        .navigationTitle("Better Rail")
      }
    }
  }
}

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
      let favoritesViewModel = FavoritesViewModel()
      favoritesViewModel.updateFavoriteRoutes(routes: ["0": "originId:680,destinationId:8800", "1": "originId:3600,destinationId:680", "2": "originId:3500,destinationId:3700"])
      
      return MainView(favorites: favoritesViewModel)
    }
}
