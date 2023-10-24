import Foundation
import HTMLString

extension String {
  var htmlConvertedString: String {
    self
      .replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression, range: nil)
      .removingHTMLEntities()
  }
}
