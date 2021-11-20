import WidgetKit
import SwiftUI

struct WidgetEntryView: View {
  var entry: TrainDetail
  @Environment(\.colorScheme) var colorScheme

    var body: some View {
      HStack {
        VStack(alignment: .leading) {
          WidgetRouteView()
          
          Spacer()
          
          if (entry.departureTime == "404") {
            Text("No more trains found for today.")
              .foregroundColor(Color("pinky")).font(.system(size: 11.5)).fontWeight(.medium).padding(.trailing, 36)

          } else {
            Text("NEXT TRAIN")
              .foregroundColor(Color("pinky")).font(.system(size: 11.5)).fontWeight(.medium)
            
            Text(entry.departureTime)
              .font(.system(size: 36)).fontWeight(/*@START_MENU_TOKEN@*/.bold/*@END_MENU_TOKEN@*/).foregroundColor(.white)
            
            Text("Platform \(entry.platform)・Train \(entry.trainNumber)")
              .font(.system(size: 11.5)).fontWeight(.medium).foregroundColor(.white).opacity(/*@START_MENU_TOKEN@*/0.8/*@END_MENU_TOKEN@*/)

          }
        }.padding([.top, .leading, .bottom])
        Spacer()
      }
      .background(
        ZStack {
          Image("tlv-hashalom")
            .resizable()
            .aspectRatio(contentMode: .fill)
          
          Rectangle().foregroundColor(Color(.sRGB, red: 0, green: 0, blue: 0, opacity: colorScheme == .dark ? 0.75 : 0.65))
        }
      )
    }
}

struct WidgetEntryView_Previews: PreviewProvider {
    static var previews: some View {
      let entry = TrainDetail(date: Date(), departureTime: "15:56", arrivalTime: "", platform: "3", trainNumber: "131")
      
      if #available(iOS 14.0, *) {
        WidgetEntryView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .systemSmall))
        
        WidgetEntryView(entry: entry)
          .previewContext(WidgetPreviewContext(family: .systemSmall)).colorScheme(.dark)
      }
    }
}
