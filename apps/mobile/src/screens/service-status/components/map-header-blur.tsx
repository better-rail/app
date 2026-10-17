import type { ComponentType, ReactElement } from "react"
import { StyleSheet, type ViewProps } from "react-native"
import { BlurView } from "expo-blur"
import MaskedViewBase from "@react-native-masked-view/masked-view"
import LinearGradient from "react-native-linear-gradient"

// masked-view 0.3.2's typings extend RN's NativeMethods, which RN 0.88 no longer exports.
const MaskedView = MaskedViewBase as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>

/** How far below the bar the blur has faded out entirely. */
const FADE = 32

type MapHeaderBlurProps = {
  /** The header's height, status bar included. */
  height: number
}

/**
 * The map softens under the header the way content does under an iOS 26 glass edge: a blur at full
 * strength behind the status bar that fades away through the bar and out below it.
 */
export function MapHeaderBlur({ height }: MapHeaderBlurProps) {
  const total = height + FADE
  return (
    <MaskedView
      style={[styles.wrapper, { height: total }]}
      pointerEvents="none"
      maskElement={
        <LinearGradient
          colors={["#000", "#000", "rgba(0, 0, 0, 0)"]}
          locations={[0, (height * 0.45) / total, 1]}
          style={StyleSheet.absoluteFill}
        />
      }
    >
      <BlurView intensity={60} tint="systemUltraThinMaterial" style={StyleSheet.absoluteFill} />
    </MaskedView>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
})
