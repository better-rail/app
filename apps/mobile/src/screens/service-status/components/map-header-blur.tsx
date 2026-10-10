import { StyleSheet } from "react-native"
import { BlurView } from "expo-blur"
import MaskedView from "@react-native-masked-view/masked-view"
import LinearGradient from "react-native-linear-gradient"

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
