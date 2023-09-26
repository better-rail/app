import SwiftUI

struct MainView: View {
  @ObservedObject var favorites: FavoritesViewModel
  
  var body: some View {
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

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
      let favoritesViewModel = FavoritesViewModel()
      favoritesViewModel.updateFavoriteRoutes(routes: ["0": "originId:680,destinationId:8800", "1": "originId:3600,destinationId:680", "2": "originId:3500,destinationId:3700"])
      
      return MainView(favorites: favoritesViewModel)
    }
}
