//
//  View+Skeleton.swift
//  
//
//  Created by v.prusakov on 10/27/22.
//

import SwiftUI

public struct SkeletonViewModifier: ViewModifier {
    
    @Environment(\.skeleton) private var skeleton
    
    enum ContentType {
        case text
        case view
    }
    
    let contentType: ContentType
    
    @State private var internalIsSkeletonable = true
    
    var isSkeletonable: Bool {
        self.skeleton.isSkeletonActive && self.internalIsSkeletonable
    }
    
    public func body(content: Content) -> some View {
        content
            .onPreferenceChange(SkeletonPreferenceKey.self, perform: { value in
                self.internalIsSkeletonable = value
            })
            .opacity(self.isSkeletonable ? 0 : 1)
            .allowsHitTesting(!self.isSkeletonable)
            .overlay(
                self.body
                    .transition(self.skeleton.transition)
            )
    }
    
    @ViewBuilder
    private var body: some View {
        if self.isSkeletonable {
            if let linesCount = self.skeleton.linesCount, self.contentType == .text {
                ForEach(0 ..< linesCount, id: \.self) { _ in
                    SkeletonShape()
                        .frame(width: self.skeleton.skeletonWidth, height: self.skeleton.skeletonHeight)
                }
            } else {
                SkeletonShape()
                    .frame(width: self.skeleton.skeletonWidth, height: self.skeleton.skeletonHeight)
            }
        }
    }
}

private struct SkeletonShape: Shape, @unchecked Sendable {

    @Environment(\.skeleton) private var skeleton
    @State private var opacity: Double = 1
    
    func path(in rect: CGRect) -> Path {
        skeleton.customShape?.path(in: rect) ?? RoundedRectangle(cornerRadius: self.skeleton.cornerRadius).path(in: rect)
    }
    
    var body: some View {
        self.shapeView
            .animation(self.skeleton.animation, value: self.skeleton.isSkeletonActive)
            .onAppear {
                DispatchQueue.main.async {
                    if self.skeleton.isSkeletonActive {
                        withAnimation(self.skeleton.animation.repeatForever(autoreverses: true), {
                            self.opacity = 0
                        })
                    }
                }
            }
    }
    
    @ViewBuilder
    private var shapeView: some View {
        switch self.skeleton.animationType {
        case .solid(let color):
            ZStack {
                self.fill(color)
                self.fill(color.complementaryColor)
                    .opacity(self.opacity)
            }
        case .gradient(let colors):
            ZStack {
                self.fill(colors.first!)
                self.fill(
                    LinearGradient(
                        gradient: Gradient(colors: colors),
                        startPoint: .bottomLeading,
                        endPoint: .topTrailing
                    )
                )
                .opacity(self.opacity)
            }
        }
    }
}
