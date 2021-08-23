import * as React from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { color, fontScale, spacing, typography } from "../../theme"
import { Text } from "../"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { translate } from "../../i18n"
import { Button } from "../button/button"

const CONTAINER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  padding: spacing[4] * fontScale,
  marginHorizontal: spacing[3],
  backgroundColor: color.tertiaryBackground,
  borderRadius: 12,
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.palette.black,
  shadowRadius: 2,
  shadowOpacity: 0.1,
  elevation: 4,
}

const TEXT: TextStyle = {
  fontFamily: typography.primary,
  fontSize: 18,
  color: color.destroy,
  fontWeight: "bold",
}

export interface FloatingBarProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: ViewStyle
}

/**
 * Describe your component here
 */
export const FloatingBar = observer(function FloatingBar(props: FloatingBarProps) {
  const { style } = props
  const insets = useSafeAreaInsets()

  return (
    <View style={[CONTAINER, style, { bottom: insets.bottom + 5 }]}>
      <Text style={TEXT}>6 {translate("routes.delayTime")}</Text>
      <Button
        title="עדכון זמנים"
        onPress={() => null}
        containerStyle={{ maxWidth: 140 }}
        textStyle={{ marginTop: -12 * fontScale }}
      />
    </View>
  )
})
