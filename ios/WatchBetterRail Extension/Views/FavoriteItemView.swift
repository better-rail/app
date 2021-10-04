import SwiftUI

struct FavoriteItemView: View {
  var origin: Station
  var destination: Station
  
    var body: some View {
        ZStack(alignment: .leading) {
            VStack(alignment: .leading) {
              Spacer()
              Text(origin.name).font(Font.custom("Heebo", size: 16)).fontWeight(.medium).padding(.bottom, -6)
              
              HStack(alignment: .center) {
                Image(systemName: "arrow.left.circle.fill").font(.system(size: 12))
                Text(destination.name).font(Font.custom("Heebo", size: 12))
              }
            }
            .padding(.bottom, 6)
            .shadow(radius: 10)
          }
        .frame(idealHeight: 130)
      
      
      }
}

struct FavoriteItemView_Previews: PreviewProvider {
    static var previews: some View {
      VStack {
//        FavoriteItemView(origin: stations[0], destination: stations[3])
//        FavoriteItemView(origin: stations[1], destination: stations[3])
        
      }
      
    }
}
