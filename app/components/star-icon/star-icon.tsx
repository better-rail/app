import React, { useMemo } from "react"
import { Image, TouchableOpacity, ImageStyle, ViewStyle, ImageSourcePropType } from "react-native"
import { observer } from "mobx-react-lite"
import { color, spacing, typography } from "../../theme"

const starImage = require("../../../assets/star.png")
const starFillImage = require("../../../assets/star-fill.png")

const CONTAINER: ViewStyle = {
  justifyContent: "center",
}

const STAR_ICON: ImageStyle = {
  width: 28,
  height: 27,
  marginEnd: spacing[2],
  marginBottom: spacing[2] - 1,
  tintColor: "lightgrey",
}

const STAR_ICON_FILLED

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
    let STAR_ICON_SOURCE: ImageSourcePropType = starImage
    let STAR_STATE_STYLE: ImageStyle = { tintColor: "lightgrey" }

    if (filled) {
      STAR_ICON_SOURCE = starFillImage
      STAR_STATE_STYLE = { tintColor: color.yellow }
    }

    return [STAR_ICON_SOURCE, STAR_STATE_STYLE]
  }, [filled])

  return (
    <TouchableOpacity onPress={onPress} style={[CONTAINER, style]}>
      <Image source={STAR_ICON_SOURCE} style={[STAR_ICON, STAR_STATE_STYLE]} />
    </TouchableOpacity>
  )
})
