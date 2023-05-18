import SwiftUI

struct MainView: View {
    var body: some View {
      VStack {
        List {
          NavigationLink("search route") {
            SearchView()
          }
          
          FavoritesView(favorites: FavoritesViewModel())
        }
        .listStyle(CarouselListStyle())
      }
      .navigationTitle("Better Rail")
    }
}

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
        MainView()
    }
}
