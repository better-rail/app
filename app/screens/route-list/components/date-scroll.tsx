import React, { useCallback } from "react"
import { View, Image, Pressable, ViewStyle, ImageStyle, TextStyle, ActivityIndicator } from "react-native"

import { color, spacing } from "../../../theme"
import { Text } from "../../../components"
import { useStores } from "../../../models"
import { localizedDate } from "../../../i18n"

const CONTAINER_STYLE: ViewStyle = {
  height: spacing[7],
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
}

const PRESSABLE_STYLE: ViewStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-around",
}

const DISABLED_STYLE: ViewStyle = {
  opacity: 0.5,
}

const ARROW_URL = "../../../../assets/chevron.png"

const ARROW_STYLE: ImageStyle = {
  width: 7,
  height: 15,
  tintColor: color.primary,
}

const INDICATOR_CONTAINER: ViewStyle = {
  width: 7,
  height: 15,
  alignItems: "center",
  justifyContent: "center",
}

const DATE_STYLE: ViewStyle = {
  elevation: 6,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-evenly",
}

const TEXT_STYLE: TextStyle = {
  textAlign: "center",
  color: color.primary,
}

export const DateScroll = function DateScroll(props: {
  setTime: () => void
  currenTime: number
  isLoadingDate?: boolean
  isDisabled?: boolean
}) {
  const { trainRoutes } = useStores()
  const isLoading = trainRoutes.status === "pending" || props.isLoadingDate
  const isDisabled = isLoading || props.isDisabled

  // This date is already the target date for the direction (forward or backward)
  const getDateString = useCallback(() => {
    return localizedDate(props.currenTime)
  }, [props.currenTime, props.isDisabled])

  const handlePress = useCallback(() => {
    // Don't allow new requests while loading or disabled
    if (isDisabled) return

    // Call the callback to load data for this direction
    props.setTime()
  }, [props.setTime, isDisabled])

  return (
    <View style={CONTAINER_STYLE}>
      <Pressable style={[PRESSABLE_STYLE, isDisabled && DISABLED_STYLE]} onPress={handlePress} disabled={isDisabled}>
        <View style={DATE_STYLE}>
          <Text text={getDateString()} style={TEXT_STYLE} />
          {isLoading ? (
            <View style={INDICATOR_CONTAINER}>
              <ActivityIndicator size="small" color={color.primary} />
            </View>
          ) : (
            <Image source={require(ARROW_URL)} style={{ ...ARROW_STYLE, transform: [{ rotate: "-90deg" }] }} />
          )}
        </View>
      </Pressable>
    </View>
  )
}
