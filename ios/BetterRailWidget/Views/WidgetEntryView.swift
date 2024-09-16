import WidgetKit
import SwiftUI

struct WidgetEntryView: View {
  var entry: TrainDetail
  @Environment(\.widgetFamily) var widgetFamily
  
  var nextTrainFontSize: CGFloat {
    widgetFamily == .systemSmall ? 36 : 32
  }
  
  var isLargeScreen: Bool {
    UIScreen.main.bounds.width > 400
  }
  
  var isMediumScreen: Bool {
    UIScreen.main.bounds.width > 375
  }
  
  var errorMessage: String? {
    getNoTrainsMessage(statusCode: entry.departureTime, date: entry.date)
  }
  
  var body: some View {
    VStack {
      HStack {
        VStack(alignment: .leading) {
          WidgetRouteView(originName: entry.origin.name, destinationName: entry.destination.name)
          
          Spacer()
          
          HStack(alignment: .top) {
            VStack(alignment: .leading) {
              if let errorMessage {
                Text(errorMessage)
                  .foregroundColor(Color("pinky")).font(.system(size: 11.5)).fontWeight(.medium).padding(.trailing, 8)

              } else {
                HStack(alignment: .lastTextBaseline) {
                  VStack(alignment: .leading) {
                    Text(entry.isTomorrow ? "TOMORROW" : "NEXT TRAIN")
                      .fontWeight(.medium)
                      .preferredFont(size: 11.5)
                      .foregroundColor(entry.isTomorrow ? Color("purply") : Color("pinky"))
                      .widgetAccentable()


                    Text(entry.departureTime)
                      .foregroundColor(.white)
                  }

                  if (widgetFamily == .systemMedium ||
                      widgetFamily == .systemLarge) {
                    VStack(alignment: .leading) {
                      Text("ARRIVAL")
                        .preferredFont(size: 11).fontWeight(.medium)
                      
                      Text(entry.arrivalTime).font(.system(size: 22, weight: .bold))
                    }.foregroundColor(.gray)
                    .padding(.leading,
                      widgetFamily == .systemLarge && isMediumScreen
                       ? 8 : 2)
                    
                    if (widgetFamily == .systemLarge) {
                      VStack(alignment: .leading) {
                        Text("PLATFORM")
                          .preferredFont(size: 11).fontWeight(.medium)
                        
                        Text(String(entry.platform)).font(.system(size: 22, weight: .bold))
                      }
                      .foregroundColor(.gray)
                      .padding(.leading, isMediumScreen ? CGFloat(8.0) : 4.0)

                      if (UIScreen.main.bounds.width >= 360) {
                        VStack(alignment: .leading) {
                          Text(isMediumScreen ? "TRAIN NO." : "TRAIN")
                            .preferredFont(size: 11).fontWeight(.medium)
                          
                          Text(String(entry.trainNumber)).font(.system(size: 22, weight: .bold))
                        }
                        .foregroundColor(.gray)
                        .padding(.leading, 8)
                      }

                    }
                  }
                }
                  .font(.system(size: nextTrainFontSize, weight: .bold))
                  
                if (widgetFamily != .systemLarge) {
                  Text("Platform \(String(entry.platform))・Train \(String(entry.trainNumber))")
                    .font(.system(size: 11.5)).fontWeight(.medium).foregroundColor(.white).opacity(/*@START_MENU_TOKEN@*/0.8/*@END_MENU_TOKEN@*/)
                }
                
              }
            }
              
            
          }
        }
        .padding(.bottom, widgetFamily == .systemLarge ? 8 : 16)
        .padding([.top, .leading])
        
        if widgetFamily == .systemMedium, let upcomingTrains = entry.upcomingTrains, upcomingTrains.count > 0 {
          Spacer()
          
          if (isLargeScreen) {
            Spacer()
          }
            
          Divider()
            .frame(width: 1.0, height: 135)
            .background(Color.gray)
            .opacity(0.3)

          Spacer()
          VStack(alignment: .leading) {
            Spacer()
            
            Text(entry.isTomorrow ? "TOMORROW" : "UPCOMING")
              .preferredFont(size: 12)
              .fontWeight(.semibold)
              .foregroundColor(.gray)
              .padding(.bottom, -1)
            
            
            ForEach(upcomingTrains) { train in
              HStack(alignment: .firstTextBaseline) {
                Text(train.departureTime)
                  .foregroundColor(.white)
                  .font(.system(size: 13, weight: .semibold))
                  .frame(minWidth: 42.5, alignment: .leading)
                  .padding(.trailing, -2)
                
                Text(train.arrivalTime)
                  .foregroundColor(.gray)
                  .font(.system(size: 13, weight: .semibold))
                  .frame(minWidth: 40, alignment: .leading)
              }.opacity(0.7).padding(.bottom, -2)
            }
            
            Spacer().padding(.bottom, upcomingTrains.count > 3 ? 0 : 16)

          }.padding([.top, .bottom], 8)
        }
        
        Spacer()
        
      }
      .frame(maxHeight: 170)
      .if(widgetFamily == .systemLarge) {
        $0.background(WidgetBackground(image: entry.origin.image).frame(height: 170))
      }
      
      if (widgetFamily == .systemLarge) {
        WidgetLargeScheduleView(upcomingTrains: entry.upcomingTrains ?? [], statusCode: entry.departureTime)
        Spacer()
      }
    }
    .if(widgetFamily != .systemLarge) {
      $0.widgetBackground(WidgetBackground(image: entry.origin.image).frame(height: 170))
    }
    .if(widgetFamily == .systemLarge) {
      $0.widgetBackground(Color(UIColor.secondarySystemBackground))
    }
  }
}

struct WidgetEntryView_Previews: PreviewProvider {
    static var previews: some View {
      let origin = getStationById(3400)!
      let destination = getStationById(680)!
      
      let entry = TrainDetail(date: Date(), departureDate: "09/01/2007 09:43:00", departureTime: "15:56", arrivalTime: "16:06", platform: 3, trainNumber: 131, origin: origin, destination: destination, label: "Home", upcomingTrains: upcomingTrainsSnapshot)

//      let entry = TrainDetail(date: Date(), departureDate: "09/01/2007 09:43:00", departureTime: "404", arrivalTime: "404", platform: 404, trainNumber: 404, origin: origin, destination: destination, label: nil)
      
      if #available(iOS 14.0, *) {

        WidgetEntryView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .systemMedium))
          .environment(\.locale, .init(identifier: "he"))
          .environment(\.layoutDirection, .rightToLeft)
        
        WidgetEntryView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .systemLarge))
          .environment(\.locale, .init(identifier: "en"))

        
//        WidgetEntryView(entry: entry)
//          .previewContext(WidgetPreviewContext(family: .systemSmall))

//        WidgetEntryView(entry: entry)
//          .previewContext(WidgetPreviewContext(family: .systemSmall))
      
      }
    }
}
