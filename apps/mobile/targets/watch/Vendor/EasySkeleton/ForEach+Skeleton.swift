//
//  ForEach+Skeleton.swift
//  
//
//  Created by v.prusakov on 10/27/22.
//

import SwiftUI

struct SkeletonForEachModifier<V: View>: ViewModifier {
    
    @Environment(\.skeleton) private var skeleton
    
    let itemsCount: Int
    let autoSkeletonable: Bool
    @ViewBuilder var content: (Int) -> V
    
    @ViewBuilder
    func body(content: Content) -> some View {
        if skeleton.isSkeletonActive {
            ForEach(0..<itemsCount, id: \.self) { index in
                if autoSkeletonable {
                    self.content(index)
                        .skeletonable()
                } else {
                    self.content(index)
                }
            }
        } else {
            content
        }
    }
}

public extension ForEach where Content: View {
    /// Create ForEach view if skeleton is active.
    func skeletonForEach<V: View>(
        itemsCount: Int,
        autoSkeletonable: Bool = true,
        @ViewBuilder content: @escaping (Int) -> V
    ) -> some View {
        self.modifier(
            SkeletonForEachModifier(
                itemsCount: itemsCount,
                autoSkeletonable: autoSkeletonable,
                content: content
            )
        )
    }
}

public extension View {
    /// Create ForEach view if skeleton is active.
    func skeletonForEach<V: View>(
        itemsCount: Int,
        autoSkeletonable: Bool = true,
        @ViewBuilder content: @escaping (Int) -> V
    ) -> some View {
        self.modifier(
            SkeletonForEachModifier(
                itemsCount: itemsCount,
                autoSkeletonable: autoSkeletonable,
                content: content
            )
        )
    }
}
