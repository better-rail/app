import SwiftUI
import WidgetKit

struct MainView: View {
  @ObservedObject var favorites: FavoritesViewModel
  
  @State var selected: FavoriteRoute?
  @State var isSearching = false
  
  var body: some View {
    if #available(watchOS 10.0, *), !favorites.routes.isEmpty {
      NavigationSplitView {
        List(favorites.routes, selection: $selected) { route in
          NavigationLink(value: route) {
            FavoriteListItemView(route: route)
          }
          .listRowBackground(StationImageBackground(route.origin.image).cornerRadius(18))
          .tag(route)
        }
        .listStyle(.carousel)
        .navigationTitle("Better Rail")
        .toolbar {
          ToolbarItem(placement: .topBarLeading) {
            Button {
              self.isSearching = true
            } label: {
              Image(systemName: "magnifyingglass")
            }
          }
        }
      } detail: {
        if let selected {
          FavoriteRouteView(route: RouteViewModel(origin: selected.origin, destination: selected.destination), label: selected.label)
        } else {
          EmptyView()
        }
      }
      .tabViewStyle(.verticalPage)
      .sheet(isPresented: $isSearching, content: {
        NavigationStack {
          SearchView()
        }
      })
      .onOpenURL { url in
        if url.host == "route",
           let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let originId = components.queryItems?.first(where: { $0.name == "originId" })?.value,
           let destinationId = components.queryItems?.first(where: { $0.name == "destinationId" })?.value,
           let selectedRoute = favorites.routes.first(where: { $0.origin.id == originId && $0.destination.id == destinationId }) {
          self.selected = selectedRoute
        }

        WidgetCenter.shared.reloadAllTimelines()
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
                  .cornerRadius(18)
              )
            
          }
          .listStyle(.carousel)
        }
        .navigationTitle("Better Rail")
      }
    }
  }
}

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
      let favoritesViewModel = FavoritesViewModel()
      favoritesViewModel.updateFavoriteRoutes(routes: ["0": "originId:680,destinationId:8800,label:Home", "1": "originId:3600,destinationId:680", "2": "originId:3500,destinationId:3700"])
      
      return MainView(favorites: favoritesViewModel)
    }
}
