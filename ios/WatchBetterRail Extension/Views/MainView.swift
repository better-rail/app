import SwiftUI
import FirebaseAuth

struct MainView: View {
    @EnvironmentObject var userInfo: UserInfo
  
    let userDefaults = UserDefaults(suiteName: "group.il.co.better-rail")
  
    var body: some View {
      VStack {
        if userInfo.isLoading {
          Spacer()
          ProgressView()
          Spacer()
        } else if userInfo.isPro {
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
        } else {
          Text("not pro user :(")
          Text(Auth.auth().currentUser?.uid ?? "No user id")
          Text(userDefaults?.string(forKey: "userId") ?? "No userdefault user id")
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
