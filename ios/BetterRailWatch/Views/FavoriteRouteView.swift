import SwiftUI
import EasySkeleton

@available(watchOS 10.0, *)
struct FavoriteRouteView: View {
  @StateObject var route: RouteViewModel
  var label: String?
  
  @StateObject var minuteTimer = MinuteTimer()
  
  let deviceWidth = WKInterfaceDevice.current().screenBounds.width
  
  var trainNumber: Int {
    route.nextTrain?.trains.first?.trainNumber ?? 0
  }
  
  var platform: Int {
    route.nextTrain?.trains.first?.platform ?? 0
  }
  
  var delay: Int {
    route.nextTrain?.trains.first?.delay ?? 0
  }
  
  var departureDate: Date {
    guard let train = route.nextTrain?.trains.first else {
      return Date.now
    }
    
    return isoDateStringToDate(train.departureTime).addMinutes(train.delay)
  }
  
  var minutesLeft: Int {
    let timeInterval = departureDate.timeIntervalSinceNow
    let minutes = Int(ceil(timeInterval / 60))
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
  
  var isTomorrowText: Bool {
    return minutesLeft > 60 && route.nextTrain?.isTomorrow ?? false
  }
  
  var routeListDate: Date? {
    guard let train = route.nextTrain?.trains.first else {
      return nil
    }
    
    return isoDateStringToDate(train.departureTime)
  }
  
  var body: some View {
    TabView {
      VStack(alignment: .leading) {
        routeName
          .padding(.top, -8)
        CriticalAlertsButton()

        Spacer()
        if !route.loading && route.nextTrain == nil {
          HStack {
            Spacer()
            if let requestError = route.error {
              InfoMessage(imageName: "wifi.exclamationmark", message: requestError.localizedDescription) {
                route.shouldRefetchRoutes()
              }
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
              .skeletonable()
            Spacer()
          }
          .font(Font.custom("Heebo", size: deviceWidth < 170 ? 9 : 10))
          .padding(.bottom, 4)
        }
      }
      .padding(8)
      .edgesIgnoringSafeArea(.bottom)
      .containerBackground(for: .tabView) {
        StationImageBackground(route.origin.image, isFullScreen: true)
      }
      .contentShape(Rectangle())
      .setSkeleton(.constant(route.trains.isEmpty), animationType: .gradient(Color.gray.makeGradient().map { $0.opacity(0.2) }))
      .skeletonCornerRadius(6)
      .onAppear {
        route.refreshNextTrainState()
      }
      .onReceive(minuteTimer.$currentTime) { _ in
        route.refreshNextTrainState()
      }
      
      NavigationStack {
        RoutesView(route: route)
          .navigationTitle("UPCOMING".capitalized)
          .containerBackground(for: .tabView) {
            EmptyView()
          }
      }
    }
    .background(
      LinearGradient(colors: [.blue, .clear], startPoint: .bottom, endPoint: .top)
        .opacity(0.25)
    )
  }
  
  var routeName: some View {
    VStack(alignment: .leading) {
      if let label {
        Text(label)
          .font(.system(size: 24))
          .fontWeight(.medium)
      } else {
        Text(route.origin.name)
          .font(.system(size: 16))
          .fontWeight(.medium)
          .padding(.bottom, -4)
        Text("\(Image(systemName: "arrow.forward.circle.fill")) \(route.destination.name)")
          .font(.system(size: 12))
      }
    }
    .font(Font.custom("Heebo", size: 14))
  }
  
  var nextTrain: some View {
    VStack(alignment: .leading) {
      Text(isTomorrowText ? "TOMORROW" : "NEXT TRAIN")
        .font(Font.custom("Heebo", size: 11))
        .foregroundStyle(isTomorrowText ? Color("purply") : Color("pinky"))
        .padding(.bottom, -12)
      HStack(alignment: .firstTextBaseline) {
        Text(fallbackText ?? String(minutesLeft))
          .font(.system(size: 48, design: .rounded))
          .bold()
        if fallbackText == nil {
          Text("min")
            .font(.system(size: 24, design: .rounded))
            .bold()
        }
      }
      .foregroundStyle(delay > 2 ? .red : .white)
      .skeletonable()
      .skeletonFrame(width: 100, height: 45)
      .padding(.top, -2)
    }
  }
}

@available(watchOS 10.0, *)
struct FavoriteRouteView_Previews: PreviewProvider {
    static var previews: some View {
      return FavoriteRouteView(route: RouteViewModel(origin: stations[0], destination: stations[2]), label: nil)
    }
}
