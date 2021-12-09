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
}

