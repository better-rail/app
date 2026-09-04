//
//  Color+Skeleton.swift
//  
//
//  Created by v.prusakov on 10/27/22.
//

import SwiftUI

#if canImport(UIKit)
import UIKit

typealias ESColor = UIColor

#elseif canImport(AppKit)
import AppKit

typealias ESColor = NSColor
#endif

extension Color {
    var complementaryColor: Color {
        isLight ? darker : lighter
    }
    
    var lighter: Color {
        adjust(by: 1.35)
    }
    
    var darker: Color {
        adjust(by: 0.9)
    }
    
    var isLight: Bool {
        guard let components = self.uiColor.cgColor.components,
              components.count >= 3 else { return false }
        let brightness = ((components[0] * 299) + (components[1] * 587) + (components[2] * 114)) / 1000
        return !(brightness < 0.5)
    }
    
    func adjust(by percent: CGFloat) -> Color {
        // swiftlint:disable:next identifier_name
        var h: CGFloat = 0, s: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        self.uiColor.getHue(&h, saturation: &s, brightness: &b, alpha: &a)
        return Color(ESColor(hue: h, saturation: s, brightness: b * percent, alpha: a))
    }
    
    public func makeGradient() -> [Color] {
        [self, self.complementaryColor, self]
    }
}

extension Color {
    var uiColor: ESColor {
        ESColor(self)
    }
}


public extension Color {
    static var skeleton: Color {
#if os(iOS)
        return Color(.systemGray4)
#elseif os(tvOS)
        return Color(.tertiaryLabel)
#elseif os(watchOS)
        return Color.secondary
#elseif os(macOS)
        return Color(NSColor(red: 0.82, green: 0.82, blue: 0.84, alpha: 1))
#else
        return Color(.tertiaryLabel)
#endif
    }
}
