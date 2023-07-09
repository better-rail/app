import React, { useMemo } from "react"
import { Image, TouchableOpacity, ImageStyle, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { color } from "../../theme"

const starImage = require("../../../assets/star.png")

const CONTAINER: ViewStyle = {
  justifyContent: "center",
}

const STAR_ICON: ImageStyle = {
  width: 27,
  height: 25,
  resizeMode: "contain",
  tintColor: "lightgrey",
  opacity: 0.9,
}

export interface StarIconProps {
  style?: ViewStyle
  onPress: () => void

  /**
   * Whether the star is outlined or filled
   */
  filled: boolean
}

export const StarIcon = observer(function StarIcon(props: StarIconProps) {
  const { onPress, filled, style } = props

  const [STAR_ICON_SOURCE, STAR_STATE_STYLE] = useMemo(() => {
    let STAR_STATE_STYLE: ImageStyle = { tintColor: "lightgrey" }

    if (filled) {
      STAR_STATE_STYLE = { tintColor: color.yellow, opacity: 0.75 }
    }

    return [STAR_ICON_SOURCE, STAR_STATE_STYLE]
  }, [filled])

  return (
    <TouchableOpacity onPress={onPress} style={[CONTAINER, style]}>
      <Image source={starImage} style={[STAR_ICON, STAR_STATE_STYLE]} />
    </TouchableOpacity>
  )
})

