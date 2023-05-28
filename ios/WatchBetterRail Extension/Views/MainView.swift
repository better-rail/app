import SwiftUI

struct MainView: View {
    @EnvironmentObject var userInfo: UserInfo
  
    var body: some View {
      VStack {
        if userInfo.isPro {
          List {
            FavoritesView(favorites: userInfo.routes)
            
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
        } else {
          Text("not pro user :(")
        }
      }
      .navigationTitle("Better Rail")
    }
}

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
        MainView()
    }
}
