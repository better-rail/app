import React, { useCallback } from "react"
import { View, Image, Pressable, ActivityIndicator } from "react-native"
import { StyleSheet } from "react-native-unistyles"

import { color } from "@/theme"
import { Text } from "@/components"
import { useTrainRoutesStore } from "@/models"
import { localizedDate } from "@/i18n"

const ARROW_URL = "../../../../assets/chevron.png"

export const DateScroll = function DateScroll(props: {
  setTime: () => void
  currenTime: number
  isLoadingDate?: boolean
  isDisabled?: boolean
}) {
  const status = useTrainRoutesStore((s) => s.status)
  const isLoading = status === "pending" || props.isLoadingDate
  const isDisabled = isLoading || props.isDisabled

  // This date is already the target date for the direction (forward or backward)
  const getDateString = useCallback(() => {
    return localizedDate(props.currenTime)
  }, [props.currenTime, props.isDisabled])

  const handlePress = () => {
    // Don't allow new requests while loading or disabled
    if (isDisabled) return

    // Call the callback to load data for this direction
    props.setTime()
  }

  return (
    <View style={styles.container}>
      <Pressable style={[styles.pressable, isDisabled && styles.disabled]} onPress={handlePress} disabled={isDisabled}>
        <View style={styles.date}>
          <Text text={getDateString()} style={styles.text} />
          {isLoading ? (
            <View style={styles.indicatorContainer}>
              <ActivityIndicator size="small" color={color.primary} />
            </View>
          ) : (
            <Image source={require(ARROW_URL)} style={[styles.arrow, { transform: [{ rotate: "-90deg" }] }]} />
          )}
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    height: theme.spacing[7],
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pressable: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  disabled: {
    opacity: 0.5,
  },
  arrow: {
    width: 7,
    height: 15,
    tintColor: theme.colors.primary,
  },
  indicatorContainer: {
    width: 7,
    height: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  date: {
    elevation: 6,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  text: {
    textAlign: "center",
    color: theme.colors.primary,
  },
}))
