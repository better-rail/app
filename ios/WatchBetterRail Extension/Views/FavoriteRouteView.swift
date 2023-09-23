import SwiftUI

struct FavoriteRouteView: View {
  @ObservedObject var route: RouteViewModel
  
  let deviceWidth = WKInterfaceDevice.current().screenBounds.width
  
  var trainNumber: Int {
    route.nextTrain?.trains.first?.trainNumber ?? 0
  }
  
  var platform: Int {
    route.nextTrain?.trains.first?.platform ?? 0
  }
  
  var departureDate: Date {
    guard let train = route.nextTrain?.trains.first else {
      return Date.now
    }
    
    return isoDateStringToDate(train.departureTime).addMinutes(train.delay)
  }
  
  var minutesLeft: Int {
    let timeInterval = departureDate.timeIntervalSinceNow
    let minutes = Int(round(timeInterval / 60))
    return minutes < 0 ? 0 : minutes
  }
  
  var fallbackText: String? {
    if minutesLeft <= 0 {
      return "Now"
    }
    
    if minutesLeft > 60 {
      return formatDateHour(departureDate)
    }
    
    return nil
  }
  
  var body: some View {
    VStack(alignment: .leading) {
      routeName
        .padding(.top, -8)
      Spacer()
      if !route.loading && route.trains.isEmpty {
        HStack {
          Spacer()
          if let requestError = route.error {
            InfoMessage(imageName: "wifi.exclamationmark", message: requestError.localizedDescription)
          } else {
            InfoMessage(imageName: "tram", message: String(localized: "no-trains-found"))
          }
          Spacer()
        }
      } else {
        nextTrain
        HStack {
          Spacer()
          Text(String(localized: "platform \(String(platform)) train no. \(String(trainNumber))"))
            .bold()
          Spacer()
        }
        .font(Font.custom("Heebo", size: deviceWidth < 170 ? 9 : 10))
        .padding(.bottom, 4)
      }
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
        Text(fallbackText ?? String(minutesLeft))
          .font(Font.custom("Heebo", size: 48))
          .bold()
        if fallbackText == nil {
          Text("min")
            .font(Font.custom("Heebo", size: 24))
            .bold()
        }
      }
      .padding(.vertical, -10)
    }
  }
}

struct FavoriteRouteView_Previews: PreviewProvider {
    static var previews: some View {
      return FavoriteRouteView(route: RouteViewModel(origin: stations[0], destination: stations[2]))
    }
}
