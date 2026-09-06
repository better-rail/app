import React from "react"
import { Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import HapticFeedback from "react-native-haptic-feedback"
import { Chip, Text } from "@/components"
import { color } from "@/theme"
import type { MaxChanges } from "@/models/settings/settings"

type Props = {
  maxChanges: MaxChanges
  onShowAll: () => void
}

export function FilteredTrainsMessage({ maxChanges, onShowAll }: Props) {
  const textKey = maxChanges === 0 ? "routes.noDirectTrainsFound" : "routes.noOneChangeTrainsFound"

  return (
    <View style={styles.wrapper}>
      <Image style={styles.searchIcon} source={require("../../../../assets/search.png")} />
      <Text tx={textKey} style={styles.text} />
      <Chip
        variant="primary"
        onPress={() => {
          HapticFeedback.trigger("impactLight")
          onShowAll()
        }}
        style={styles.chip}
      >
        <Text tx="routes.showAllTrains" style={styles.chipText} />
      </Chip>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[8] * 4,
  },
  searchIcon: {
    width: 57.5,
    height: 57.5,
    marginBottom: theme.spacing[2],
    opacity: 0.7,
    tintColor: theme.colors.text,
  },
  text: {
    marginBottom: theme.spacing[4],
    textAlign: "center",
  },
  chip: {
    paddingVertical: theme.spacing[2],
  },
  chipText: {
    color: color.whiteText,
    textAlign: "center",
  },
}))
