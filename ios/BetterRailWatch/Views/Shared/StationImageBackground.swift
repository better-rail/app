import SwiftUI

struct StationImageBackground: View {
  let imageName: String?
  let isFullScreen: Bool
  
  let deviceSize = WKInterfaceDevice.current().screenBounds
  
  init(_ imageName: String?, isFullScreen: Bool = false) {
    self.imageName = imageName
    self.isFullScreen = isFullScreen
  }
  
    var body: some View {
      ZStack {
        if let stationImage = imageName {
          if isFullScreen {
            Image(stationImage)
              .resizable()
              .scaledToFill()
              .frame(width: deviceSize.width, height: deviceSize.height)
              .edgesIgnoringSafeArea(.all)
          } else {
            Image(stationImage).resizable()
          }
          Rectangle().foregroundColor(Color(.sRGB, red: 0, green: 0, blue: 0, opacity: isFullScreen ? 0.65 : 0.45))
        } else {
          Rectangle().fill(Color("midnightBlue"))
        }
      }.cornerRadius(18)
    }
}

struct StationImageBackground_Previews: PreviewProvider {
    static var previews: some View {
      StationImageBackground("tlv-hashalom")
      StationImageBackground(nil)
    }
}
