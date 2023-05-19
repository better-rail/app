import SwiftUI

struct MainView: View {
    var body: some View {
      VStack {
        List {
          FavoritesView(favorites: FavoritesViewModel())
          
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

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
        MainView()
    }
}
