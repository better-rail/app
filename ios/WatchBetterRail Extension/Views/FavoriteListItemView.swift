import SwiftUI

struct FavoriteListItemView: View {
  var route: FavoriteRoute
  
  var body: some View {
      ZStack(alignment: .leading) {
          VStack(alignment: .leading) {
            Spacer()
            
            if let label = route.label {
              Text(label).font(Font.custom("Heebo", size: 24)).fontWeight(.medium).padding(.bottom, -6)
            } else {
              Text(route.origin.name).font(Font.custom("Heebo", size: 16)).fontWeight(.medium).padding(.bottom, -6)
              
              
              HStack(alignment: .center) {
                Image(systemName: "arrow.forward.circle.fill").font(.system(size: 12))
                Text(route.destination.name).font(Font.custom("Heebo", size: 12))
              }
            }
          }
          .padding(.bottom, 6)
          .shadow(radius: 10)
      }
      .frame(idealHeight: 90)
      .listRowBackground(StationImageBackground(route.origin.image))
    }
}
