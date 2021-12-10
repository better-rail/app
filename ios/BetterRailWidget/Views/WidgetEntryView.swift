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
  
  var body: some View {
    HStack {
      VStack(alignment: .leading) {
        WidgetRouteView(
          originName: entry.origin.name,
          destinationName: entry.destination.name
        )
        
        Spacer()
        
        HStack(alignment: .top) {
          VStack(alignment: .leading) {
            if (entry.departureTime == "404") {
              Text(getNoTrainsMessage(date: entry.date))
                .foregroundColor(Color("pinky")).font(.system(size: 11.5)).fontWeight(.medium).padding(.trailing, 8)

            } else {
              HStack(alignment: .lastTextBaseline) {
                VStack(alignment: .leading) {
                  Text("NEXT TRAIN")
                    .fontWeight(.medium)
                    .preferredFont(size: 11.5)
                    .foregroundColor(Color("pinky"))
                  
                  Text(entry.departureTime)
                    .foregroundColor(.white)
                }.padding(.trailing, 4)

                  
                if (widgetFamily == .systemMedium) {
                  VStack(alignment: .leading) {
                    Text("ARRIVAL")
                      .preferredFont(size: 11).fontWeight(.medium)
                    
                    Text(entry.arrivalTime).font(.system(size: 22, weight: .bold))
                  }.foregroundColor(.gray)
                  
                }
              }
                .font(.system(size: nextTrainFontSize, weight: .bold))
                
                
              Text("Platform \(entry.platform)・Train \(entry.trainNumber)")
                .font(.system(size: 11.5)).fontWeight(.medium).foregroundColor(.white).opacity(/*@START_MENU_TOKEN@*/0.8/*@END_MENU_TOKEN@*/)
            }
          }
            
          
        }
      }.padding([.top, .leading, .bottom])
      
      if widgetFamily == .systemMedium, let upcomingTrains = entry.upcomingTrains {
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
          
          Text("UPCOMING")
            .preferredFont(size: 12)
            .fontWeight(.semibold)
            .foregroundColor(.gray)
            .padding(.bottom, -2)
          
          
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
          
          Spacer().padding(.bottom, 8)
        }.padding([.top, .bottom])
        
      }
      
      Spacer()
      
    }
    .background(
      WidgetBackground(image: entry.origin.image)
    ).widgetURL(URL(string: "widget://route?originId=\(entry.origin.id)&destinationId=\(entry.destination.id)")!)
  }
}

struct WidgetEntryView_Previews: PreviewProvider {
    static var previews: some View {
      let origin = getStationById("4600")!
      let destination = getStationById("680")!
      
      let entry = TrainDetail(date: Date(), departureTime: "15:56", arrivalTime: "16:06", platform: "3", trainNumber: "131", origin: origin, destination: destination, upcomingTrains: upcomingTrainsSnapshot)
      
//      let emptyEntry = TrainDetail(date: Date(), departureTime: "404", arrivalTime: "404", platform: "404", trainNumber: "404", origin: origin, destination: destination)
      
      if #available(iOS 14.0, *) {
        WidgetEntryView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .systemMedium))
        
        WidgetEntryView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .systemMedium))
          .environment(\.locale, .init(identifier: "he"))
          .environment(\.layoutDirection, .rightToLeft)
        
//        WidgetEntryView(entry: entry)
//          .previewContext(WidgetPreviewContext(family: .systemSmall))

//        WidgetEntryView(entry: emptyEntry)
//          .previewContext(WidgetPreviewContext(family: .systemSmall))
      
      }
    }
}
