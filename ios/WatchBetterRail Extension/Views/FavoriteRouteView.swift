import SwiftUI

struct FavoriteRouteView: View {
  let route: FavoriteRoute
  
  let deviceWidth = WKInterfaceDevice.current().screenBounds.width
  
  var body: some View {
    VStack(alignment: .leading) {
      routeName
        .padding(.top, -8)
      Spacer()
      nextTrain
      HStack {
        Spacer()
        Text("PLATFORM 6・TRAIN NO. 2633")
          .bold()
        Spacer()
      }
      .font(Font.custom("Heebo", size: deviceWidth < 170 ? 9 : 10))
      .padding(.bottom, 4)
    }
    .padding(8)
    .contentShape(Rectangle())
  }
  
  var routeName: some View {
    VStack(alignment: .leading) {
      Text(route.origin.name)
        .font(.system(size: 16))
        .fontWeight(.medium)
        .padding(.bottom, -4)
      HStack(alignment: .center) {
        Image(systemName: "arrow.forward.circle.fill")
          .font(.system(size: 12))
        Text(route.destination.name)
          .font(.system(size: 12))
      }
    }
    .font(Font.custom("Heebo", size: 14))
  }
  
  var nextTrain: some View {
    VStack(alignment: .leading) {
      Text("NEXT TRAIN")
        .font(Font.custom("Heebo", size: 11))
        .foregroundStyle(Color("pinky"))
        .padding(.bottom, -8)
      HStack(alignment: .firstTextBaseline) {
        Text("3")
          .font(Font.custom("Heebo", size: 48))
          .bold()
        Text("min")
          .font(Font.custom("Heebo", size: 24))
          .bold()
      }
      .padding(.vertical, -10)
    }
  }
}

struct FavoriteRouteView_Previews: PreviewProvider {
    static var previews: some View {
      return FavoriteRouteView(route: FavoriteRoute(id: 0, origin: stations[0], destination: stations[2]))
    }
}
