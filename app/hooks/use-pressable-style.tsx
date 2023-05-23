import { useMemo } from "react"
import { Platform } from "react-native"

export function usePressableStyle({ baseStyle, isPressed, disabled }) {
  const pressableStyle = useMemo(() => {
    let modifiedStyles = Object.assign({}, baseStyle)

    if (Platform.OS === "ios") {
      if (isPressed && !disabled) {
        modifiedStyles = Object.assign(modifiedStyles, { backgroundColor: "grey", opacity: 0.8 })
      }
    }
    return modifiedStyles
  }, [isPressed, disabled])

  return pressableStyle
}
