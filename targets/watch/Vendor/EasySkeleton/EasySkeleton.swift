//
//  EasySkeleton.swift
//  EasySkeleton
//
//  Created by v.prusakov on 10/27/22.
//

import SwiftUI

public struct SkeletonData: @unchecked Sendable {
    
    public enum AnimationType {
        case solid(Color)
        case gradient([Color])
    }
    
    // Set current state for nested skeletons
    fileprivate(set) var skeletonActive: Binding<Bool> = .constant(false)
    public fileprivate(set) var animation: Animation = Animation.easeInOut(duration: 1)
    
    public var isSkeletonActive: Bool {
        self.skeletonActive.wrappedValue
    }
    
    public fileprivate(set) var transition: AnyTransition = AnyTransition
        .asymmetric(insertion: .opacity, removal: .opacity)
        .animation(.easeInOut(duration: 0.2))
    
    public fileprivate(set) var cornerRadius: CGFloat = 0
    public fileprivate(set) var cornerStyle: RoundedCornerStyle = .circular
    public fileprivate(set) var customShape: AnyShape?
    
    public fileprivate(set) var skeletonWidth: CGFloat?
    public fileprivate(set) var skeletonHeight: CGFloat?
    
    /// Only for Text
    public fileprivate(set) var linesCount: Int?
    public fileprivate(set) var animationType: AnimationType = .solid(Color.skeleton)
}


struct SkeletonableEnvironmentKey: EnvironmentKey {
    static var defaultValue: SkeletonData = .init()
}

public extension EnvironmentValues {
    internal(set) var skeleton: SkeletonData {
        get { self[SkeletonableEnvironmentKey.self] }
        set { self[SkeletonableEnvironmentKey.self] = newValue }
    }
}

struct SkeletonPreferenceKey: PreferenceKey {
    static var defaultValue: Bool = true
    
    static func reduce(value: inout Bool, nextValue: () -> Bool) {
        value = nextValue()
    }
}

public extension View {
    
    /// Apply skeleton modifier to View
    func skeletonable() -> some View {
        self.modifier(SkeletonViewModifier(contentType: .view))
    }
    
    /// Disable skeleton for current view and it childs
    func unskeletonable() -> some View {
        self.preference(key: SkeletonPreferenceKey.self, value: false)
    }
    
    /// Apply corner radius to skeleton modifier
    func skeletonCornerRadius(_ cornerRadius: CGFloat, style: RoundedCornerStyle = .circular) -> some View {
        self.transformEnvironment(\.skeleton) { skeleton in
            skeleton.cornerRadius = cornerRadius
            skeleton.cornerStyle = style
        }
    }
    
    /// Apply `linesCount` to skeleton modifier if SkeletonModifier was applied to `Text`
    func skeletonLinesCount(_ count: Int?) -> some View {
        self.transformEnvironment(\.skeleton) { skeleton in
            skeleton.linesCount = count
        }
    }
    
    /// Apply width and/or height modification for skeleton
    func skeletonFrame(width: CGFloat? = nil, height: CGFloat? = nil) -> some View {
        self.transformEnvironment(\.skeleton) { skeleton in
            height.flatMap { skeleton.skeletonHeight = $0 }
            width.flatMap { skeleton.skeletonWidth = $0 }
        }
    }
    
    /// Change shape for skeleton.
    /// - Parameter shape: New shape for skeleton. Set nil to return default skeleton.
    func skeletonShape<S: Shape>(_ shape: S?) -> some View {
        self.transformEnvironment(\.skeleton) { skeleton in
            skeleton.customShape = shape.flatMap(AnyShape.init)
        }
    }
    
    /// Change state for nested skeletons settings in environment
    /// - Parameter isActive: Control visible state for skeletons.
    /// - Parameter animationType: Set animation behaviour for skeletons.
    /// - Parameter animation: Animation for skeletons.
    /// - Parameter transition: Transition for appearing and disappearing for skeletons.
    func setSkeleton(
        _ isActive: Binding<Bool>,
        animationType: SkeletonData.AnimationType = .gradient(Color.skeleton.makeGradient()),
        animation: Animation? = nil,
        transition: AnyTransition? = nil,
        cornerRadius: CGFloat = 0
    ) -> some View {
        self.transformEnvironment(\.skeleton) { skeleton in
            skeleton.skeletonActive = isActive.animation(animation)
            skeleton.animationType = animationType
            skeleton.cornerRadius = cornerRadius
            animation.flatMap { skeleton.animation = $0 }
            transition.flatMap { skeleton.transition = $0 }
        }
    }
}

public extension Text {
    /// Apply skeleton modifer to Text.
    /// - Note: Skeleton applied to Text can be customized with `skeletonLinesCount(_ count: Int?)` method
    func skeletonable() -> ModifiedContent<Text, SkeletonViewModifier> {
        self.modifier(SkeletonViewModifier(contentType: .text))
    }
    
}
