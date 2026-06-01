//
//  List+Skeleton.swift
//
//
//  Created by Jalil Fierro on 23/07/24.
//

import SwiftUI

struct SkeletonListModifier<V: View>: ViewModifier {

    @Environment(\.skeleton) private var skeleton

    let itemsCount: Int
    let autoSkeletonable: Bool
    @ViewBuilder var content: (Int) -> V

    @ViewBuilder
    func body(content: Content) -> some View {
        if skeleton.isSkeletonActive {
            List(0..<itemsCount, id: \.self) { index in
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

public extension List where Content: View {
    func skeletonList<V: View>(
        itemsCount: Int,
        autoSkeletonable: Bool = true,
        @ViewBuilder content: @escaping (Int) -> V
    ) -> some View {
        self.modifier(
            SkeletonListModifier(
                itemsCount: itemsCount,
                autoSkeletonable: autoSkeletonable,
                content: content
            )
        )
    }
}
