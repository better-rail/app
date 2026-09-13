import SwiftUI
import WidgetKit

struct MainView: View {
  @ObservedObject var favorites: FavoritesViewModel
  
  @State var selected: FavoriteRoute?
  @State var path: [FavoriteRoute] = []
  @State var isSearching = false
  
  var body: some View {
    if #available(watchOS 27.0, *), !favorites.routes.isEmpty {
      NavigationStack(path: $path) {
        reorderableFavorites
          .navigationDestination(for: FavoriteRoute.self) { route in
            FavoriteRouteView(route: RouteViewModel(origin: route.origin, destination: route.destination), label: route.label)
          }
          .navigationTitle("Better Rail")
          .toolbar { searchToolbar }
      }
      .sheet(isPresented: $isSearching) { searchSheet }
      .onOpenURL { url in
        if let route = favoriteRoute(from: url) {
          path = [route]
        }
        WidgetCenter.shared.reloadAllTimelines()
      }
    } else if #available(watchOS 10.0, *), !favorites.routes.isEmpty {
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
        .toolbar { searchToolbar }
      } detail: {
        if let selected {
          FavoriteRouteView(route: RouteViewModel(origin: selected.origin, destination: selected.destination), label: selected.label)
        } else {
          EmptyView()
        }
      }
      .tabViewStyle(.verticalPage)
      .sheet(isPresented: $isSearching) { searchSheet }
      .onOpenURL { url in
        if let route = favoriteRoute(from: url) {
          selected = route
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

extension MainView {
  /// Drag-to-reorder is new in watchOS 27. It doesn't fire inside a watchOS `List`, so this
  /// branch lays the favorites out in a stack styled like the carousel rows.
  @available(watchOS 27.0, *)
  var reorderableFavorites: some View {
    ScrollView {
      VStack(spacing: 8) {
        ForEach(favorites.routes) { route in
          NavigationLink(value: route) {
            FavoriteListItemView(route: route)
              .padding(.horizontal, 12)
              .frame(maxWidth: .infinity, minHeight: 90, alignment: .leading)
              .background(StationImageBackground(route.origin.image))
              .clipShape(RoundedRectangle(cornerRadius: 18))
          }
          .buttonStyle(.plain)
        }
        .reorderable()
      }
    }
    .reorderContainer(for: FavoriteRoute.self) { difference in
      var beforeId: String?
      if case .before(let id) = difference.destination.position {
        beforeId = id
      }
      favorites.moveRoutes(ids: difference.sources, before: beforeId)
    }
  }
  
  @available(watchOS 10.0, *)
  var searchToolbar: some ToolbarContent {
    ToolbarItem(placement: .topBarLeading) {
      Button {
        isSearching = true
      } label: {
        Image(systemName: "magnifyingglass")
      }
    }
  }
  
  var searchSheet: some View {
    NavigationStack {
      SearchView()
    }
  }
  
  /// Resolves a widget deep link (widget://route?originId=…&destinationId=…) to a favorite.
  func favoriteRoute(from url: URL) -> FavoriteRoute? {
    guard url.host == "route",
          let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
          let originId = components.queryItems?.first(where: { $0.name == "originId" })?.value,
          let destinationId = components.queryItems?.first(where: { $0.name == "destinationId" })?.value
    else { return nil }
    return favorites.routes.first { $0.origin.id == originId && $0.destination.id == destinationId }
  }
}

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
      let favoritesViewModel = FavoritesViewModel()
      favoritesViewModel.updateFavoriteRoutes(routes: ["0": "originId:680,destinationId:8800,label:Home", "1": "originId:3600,destinationId:680", "2": "originId:3500,destinationId:3700"])
      
      return MainView(favorites: favoritesViewModel)
    }
}
