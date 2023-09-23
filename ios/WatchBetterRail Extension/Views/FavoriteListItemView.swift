import SwiftUI

struct FavoriteListItemView: View {
  var origin: Station
  var destination: Station
  
    var body: some View {
        ZStack(alignment: .leading) {
            VStack(alignment: .leading) {
              Spacer()
              Text(origin.name).font(Font.custom("Heebo", size: 16)).fontWeight(.medium).padding(.bottom, -6)
              
              
              HStack(alignment: .center) {
                Image(systemName: "arrow.forward.circle.fill").font(.system(size: 12))
                Text(destination.name).font(Font.custom("Heebo", size: 12))
              }
            }
            .padding(.bottom, 6)
            .shadow(radius: 10)
        }
        .frame(idealHeight: 90)
        .listRowBackground(StationImageBackground(origin.image))
      }
}
