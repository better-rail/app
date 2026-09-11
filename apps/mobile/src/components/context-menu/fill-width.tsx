import React, { useLayoutEffect, useRef, useState } from "react"
import { View, type StyleProp, type ViewStyle } from "react-native"

interface FillWidthProps {
  style?: StyleProp<ViewStyle>
  children: (width: number | undefined) => React.ReactNode
}

// Since @expo/ui 57.0.15 a matchContents RNHostView lays its RN child out at the child's own width, with no
// parent width to stretch to, so auto-width content shrinks to its content and sits at the leading edge.
// We measure the container and hand the hosted child an explicit width, as upstream does for bottom-sheet.
// Drop this once RNHostView supports per-axis matchContents (Host already does).
export function FillWidth({ style, children }: FillWidthProps) {
  const ref = useRef<View>(null)
  const [width, setWidth] = useState<number>()

  // Measured before paint, so the content doesn't flash at its narrow width
  useLayoutEffect(() => {
    setWidth(ref.current?.getBoundingClientRect().width || undefined)
  }, [])

  return (
    <View ref={ref} style={style} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {children(width)}
    </View>
  )
}
