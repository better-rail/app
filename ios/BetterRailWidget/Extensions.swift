import Foundation
import SwiftUI

extension String {
  func turnucateTextAfterHyphen() -> String {
    var newText = self
    
    if let hyphenIndex = newText.firstIndex(of: "-") {
      let startIndex = newText.index(hyphenIndex, offsetBy: -1)
      
      let range = startIndex ..< newText.endIndex
      newText.removeSubrange(range)
      
      return newText
    }
    
    return self
  }
}

extension Text {
  func preferredFont(size: CGFloat) -> Text {
    let userLocale = getUserLocale()
    
    switch userLocale {
    // Hebrew font appears to render smaller than engilsh system font
    case .hebrew: return self.font(.system(size: size + 1))
      default: return self.font(.system(size: size))
    }
  }
  
  func heavyWide() -> Text {
    if #available(iOS 16.0, *) {
      return self.fontWeight(.heavy).fontWidth(Font.Width(0.1))
    } else {
      return self.fontWeight(.heavy)
    }
  }
}

@available(iOS, deprecated: 15.0, message: "Use the built-in API instead")
extension URLSession {
    func data(from url: URL) async throws -> (Data, URLResponse) {
        try await withCheckedThrowingContinuation { continuation in
            let task = self.dataTask(with: url) { data, response, error in
                guard let data = data, let response = response else {
                    let error = error ?? URLError(.badServerResponse)
                    return continuation.resume(throwing: error)
                }

                continuation.resume(returning: (data, response))
            }

            task.resume()
        }
    }
}



