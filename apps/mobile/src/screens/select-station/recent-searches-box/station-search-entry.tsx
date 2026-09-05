import React from "react"
import { View, Image, Appearance, Platform } from "react-native"
import type { ImageSourcePropType } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { ContextMenu } from "@/components/context-menu/context-menu"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "@/components"
import { translate } from "@/i18n"

const colorScheme = Appearance.getColorScheme()

type StationSearchEntryProps = {
  image: ImageSourcePropType
  name: string
  onHide: () => void
  onPress: () => void
}

export const StationSearchEntry = (props: StationSearchEntryProps) => (
  <TouchableScale
    onPress={props.onPress}
    activeScale={0.96}
    friction={8}
    tension={Platform.select({ ios: 8, android: undefined })}
    style={styles.searchEntryWrapper}
  >
    <ContextMenu
      title={props.name}
      previewBorderRadius={6}
      actions={[{ title: translate("selectStation.hide"), systemIcon: "trash", destructive: true, onPress: props.onHide }]}
    >
      <View style={styles.searchEntryImageWrapper}>
        {props.image ? (
          <Image source={props.image} style={styles.searchEntryImage} />
        ) : (
          <View style={styles.emptyCardWrapper}>
            <Image source={require("../../../../assets/railway-station.png")} style={styles.emptyCardImage} />
          </View>
        )}
      </View>
    </ContextMenu>
    <Text style={styles.searchEntryText}>{props.name}</Text>
  </TouchableScale>
)

const styles = StyleSheet.create((theme) => ({
  searchEntryWrapper: {
    alignItems: "center",
  },
  searchEntryImageWrapper: {
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "rgba(0,0,0,.3)",
    shadowRadius: 1.5,
    shadowOpacity: colorScheme === "light" ? 0.5 : 0,
    backgroundColor: theme.colors.inputPlaceholderBackground,
    borderRadius: Platform.select({ ios: 10, android: 4 }),
    borderCurve: "continuous",
  },
  searchEntryImage: {
    width: 175,
    height: 125,
    borderRadius: Platform.select({ ios: 10, android: 6 }),
  },
  searchEntryText: {
    marginTop: theme.spacing[1],
  },
  emptyCardWrapper: {
    width: 175,
    height: 125,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: Platform.select({ ios: 6, android: 4 }),
  },
  emptyCardImage: {
    width: 48,
    height: 48,
    marginBottom: theme.spacing[2],
    tintColor: theme.colors.dim,
  },
}))
