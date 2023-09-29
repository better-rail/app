import WidgetKit
import SwiftUI

struct AccessoryEntryView: View {
  var entry: TrainDetail
  @Environment(\.widgetFamily) var widgetFamily
  
  var errorMessage: String? {
    getNoTrainsMessage(statusCode: entry.departureTime, date: entry.date)
  }
  
  var shouldShowTimeInCircular: Bool {
    if entry.isTomorrow {
      if let futureDate = Calendar.current.date(byAdding: .hour, value: 23, to: Date.now) {
        return isoDateStringToDate(entry.departureDate) <= futureDate
      } else {
        return false
      }
    } else {
      return true
    }
  }
  
  var body: some View {
    switch widgetFamily {
    case .accessoryInline:
      if let errorMessage {
        Text(errorMessage)
      } else {
        Text("\(String(localized: entry.isTomorrow ? "TOMORROW" : "NEXT TRAIN")) \(entry.departureTime)")
      }
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        if entry.departureTime == "404" {
          Image(systemName: "wifi.exclamationmark")
            .resizable()
            .scaledToFit()
            .padding(12)
        } else if !shouldShowTimeInCircular || entry.departureTime == "300" {
          Image(systemName: "tram")
            .resizable()
            .scaledToFit()
            .padding(12)
        } else {
          Text(entry.departureTime)
        }
      }
      .widgetBackground(WidgetBackground(image: entry.origin.image).frame(height: 170))
    #if os(watchOS)
    case .accessoryCorner:
      if errorMessage != nil {
        Image(systemName: entry.departureTime == "404" ? "wifi.exclamationmark" : "tram")
          .resizable()
          .scaledToFit()
          .padding(4)
          .widgetLabel {
            Text("BETTER RAIL")
          }
          .widgetBackground(WidgetBackground(image: entry.origin.image).frame(height: 170))
      } else {
        Text(entry.departureTime)
          .widgetCurvesContent()
          .widgetLabel {
            Text(entry.isTomorrow ? "TOMORROW" : "NEXT TRAIN")
              .foregroundColor(entry.isTomorrow ? Color("purply") : Color("pinky"))
          }
          .widgetBackground(WidgetBackground(image: entry.origin.image).frame(height: 170))
      }
    #endif
    case .accessoryRectangular:
        GeometryReader { geometry in
          VStack(alignment: .leading) {
            if let label = entry.label {
              Text(label)
                .font(.system(size: geometry.size.width * 0.09))
                .lineLimit(1)
                .fontWeight(.medium)
            } else {
              Text("\(formatStationName(entry.origin.name)) \(Image(systemName: "arrow.forward.circle.fill")) \(formatStationName(entry.destination.name))")
                .font(.system(size: geometry.size.width * 0.09))
                .lineLimit(1)
                .fontWeight(.medium)
            }
            Spacer()
            HStack(alignment: .lastTextBaseline, spacing: 3.5) {
              if let errorMessage {
                Spacer()
                Text(errorMessage)
                  .multilineTextAlignment(.center)
                  .font(.system(size: geometry.size.width * 0.08))
                Spacer()
              } else {
                VStack(alignment: .leading) {
                  Text(entry.isTomorrow ? "TOMORROW" : "NEXT TRAIN")
                    .font(.system(size: geometry.size.width * 0.06))
                    .foregroundColor(entry.isTomorrow ? Color("purply") : Color("pinky"))
                    .offset(y: 4)
                  Text(entry.departureTime)
                    .bold()
                    .font(.system(size: geometry.size.width * 0.145, design: .rounded))
                    .fixedSize()
                }
                
                if let upcomingTrains = entry.upcomingTrains?.prefix(2) {
                  VStack(alignment: .leading) {
                    Text("UPCOMING")
                      .font(.system(size: geometry.size.width * 0.055))
                      .foregroundColor(.gray)
                      .offset(y: 2)
                    
                    HStack(spacing: 3.5) {
                      ForEach(Array(upcomingTrains.enumerated()), id: \.offset) { index, upcomingTrain in
                        Text(upcomingTrain.departureTime)
                          .bold()
                          .font(.system(size: geometry.size.width * 0.1, design: .rounded))
                          .foregroundColor(.gray)
                          .fixedSize()
                      }
                    }
                  }
                }
              }
            }
          }
        }
        .widgetBackground(WidgetBackground(image: entry.origin.image).frame(height: 170))
    default:
      Text(entry.departureTime)
        .widgetBackground(WidgetBackground(image: entry.origin.image).frame(height: 170))
    }
  }
}

struct AccessoryEntryView_Previews: PreviewProvider {
    static var previews: some View {
      let origin = getStationById(3700)!
      let destination = getStationById(8600)!
      
      let entry = TrainDetail(date: Date(), departureDate: "09/01/2007 09:43:00", departureTime: "15:56", arrivalTime: "16:06", platform: 3, trainNumber: 131, origin: origin, destination: destination, label: nil, upcomingTrains: upcomingTrainsSnapshot)

//      let entry = TrainDetail(date: Date(), departureDate: "09/01/2007 09:43:00", departureTime: "404", arrivalTime: "404", platform: 404, trainNumber: 404, origin: origin, destination: destination, label: nil)
      
      if #available(iOS 14.0, *) {
        AccessoryEntryView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
          .environment(\.locale, .init(identifier: "he"))
          .environment(\.layoutDirection, .rightToLeft)
        
        AccessoryEntryView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
          .environment(\.locale, .init(identifier: "en"))
      }
    }
}
