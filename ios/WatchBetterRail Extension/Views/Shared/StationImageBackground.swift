import SwiftUI

struct StationImageBackground: View {
  let imageName: String?
  
  init(_ imageName: String?) {
    self.imageName = imageName
  }
  
    var body: some View {
      ZStack {
        if let stationImage = imageName {
          Image(stationImage).resizable()
          Rectangle().foregroundColor(Color(.sRGB, red: 0, green: 0, blue: 0, opacity: 0.45))
        } else {
          Rectangle().fill(Color("midnightBlue"))
        }
      }.cornerRadius(5)
    }
}

struct StationImageBackground_Previews: PreviewProvider {
    static var previews: some View {
      StationImageBackground("tlv-hashalom")
      StationImageBackground(nil)
    }
}
