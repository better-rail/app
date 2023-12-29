import SwiftUI

struct RoutesView: View {
  @ObservedObject var route: RouteViewModel
  
  var grouppedTrains: [String : [Route]] {
    let futureTrains = route.trains.filter { train in
      guard let nextTrain = route.nextTrain else {
        return true
      }
      
      let currentTrainDepartureTime = isoDateStringToDate(train.departureTime).addMinutes(train.delay)
      
      let nextTrainDepartureTime = isoDateStringToDate(nextTrain.departureTime).addMinutes(nextTrain.delay)
      
      return currentTrainDepartureTime >= nextTrainDepartureTime
    }
    
    let formatter = DateFormatter()
    formatter.setLocalizedDateFormatFromTemplate("EEE, d/M")
    
    return Dictionary(grouping: futureTrains, by: { train in
      let departureDate = isoDateStringToDate(train.departureTime)
      let daysDiff = Calendar.current.dateComponents([.day], from: .now.midnight, to: departureDate).day!
      
      switch daysDiff {
      case 0:
        return String(localized: "UPCOMING").capitalized
      case 1:
        return String(localized: "TOMORROW").capitalized
      default:
        return formatter.string(from: departureDate)
      }
    })
  }

    var body: some View {
      ScrollViewReader { proxy in
        VStack {
          if route.loading {
            ProgressView()
              .progressViewStyle(.circular)
          } else if let requestError = route.error {
            InfoMessage(imageName: "wifi.exclamationmark", message: requestError.localizedDescription) {
              route.shouldRefetchRoutes()
            }
          } else if route.trains.count == 0 {
            InfoMessage(imageName: "tram", message: String(localized: "no-trains-found"))
          } else {
            List {
              ForEach(Array(grouppedTrains.keys), id: \.self) { key in
                Section(key) {
                  ForEach(grouppedTrains[key]!) { trainDetails in
                    RouteListItem(trainDetails: trainDetails)
                  }
                }
              }
            }
            .listStyle(.carousel)
            .environment(\.defaultMinListRowHeight, 10)
          }
        }
        .onAppear {
          route.shouldRefetchRoutes()
        }
      }
    }
}

struct RouteListItem: View {
  var trainDetails: Route
  
  let deviceWidth = WKInterfaceDevice.current().screenBounds.width
  
  var body: some View {
    NavigationLink(destination: TrainDetailsView(trainRoute: trainDetails)) {
      ZStack {
        if trainDetails.delay > 0 {
          Text("+\(String(trainDetails.delay)) min")
            .font(Font.custom("Heebo", size: deviceWidth * 0.07))
            .fontWeight(.bold)
            .padding(.horizontal, 6)
            .background(.red)
            .cornerRadius(16)
        } else {
          Image(systemName: "arrow.forward")
        }
        
        HStack {
          HStack(spacing: trainDetails.delay > 0 ? 2 : nil) {
            Text(formatRouteHour(trainDetails.departureTime))
          }
          
          Spacer()
          
          Text(formatRouteHour(trainDetails.arrivalTime))
        }
      }
    }
    .frame(height: 50)
  }
}

struct InfoMessage: View {
  var imageName: String
  var message: String
  var onTryAgain: (() -> Void)?
  
  var body: some View {
    VStack(alignment: .center) {
      Spacer()
      Image(systemName: imageName).padding(.vertical, 2.0).font(.system(size: 24))
      Text(message).font(Font.custom("Heebo", size: 14)).multilineTextAlignment(.center)
      if let onTryAgain {
        Button(action: onTryAgain, label: {
          Text("try again")
        })
      }
      Spacer()
    }
  }
}

struct RoutesView_Previews: PreviewProvider {
    static var previews: some View {
      RoutesView(route: RouteViewModel(origin: stations[0], destination: stations[1]))
    }
}
