import Foundation
import HTMLString

extension String {
  var htmlConvertedString: String {
    self
      .replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression, range: nil)
      .removingHTMLEntities()
  }
}

extension Array where Element: Hashable {
    func uniq<T: Hashable>(by keyPath: KeyPath<Element, T>) -> [Element] {
        var unique = Set<T>()  // Unique set of T
        return filter { unique.insert($0[keyPath: keyPath]).inserted }
    }
}
