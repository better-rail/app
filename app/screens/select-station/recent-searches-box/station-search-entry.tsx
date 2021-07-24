import React from "react"
import { View, Image, ViewStyle, ImageStyle, ImageSourcePropType, Appearance, Platform } from "react-native"
import { ContextMenuView } from "react-native-ios-context-menu"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../../../components"
import { translate } from "../../../i18n"
import { spacing, color } from "../../../theme"

const colorScheme = Appearance.getColorScheme()

const SEARCH_ENTRY_WRAPPER: ViewStyle = {
  alignItems: "center",
  marginEnd: spacing[3],
}

const SEARCH_ENTRY_IMAGE_WRAPPER: ViewStyle = {
  shadowOffset: { width: 0, height: 0 },
  shadowColor: "rgba(0,0,0,.3)",
  shadowRadius: 1.5,
  shadowOpacity: colorScheme === "light" ? 0.5 : 0,
}

const SEARCH_ENTRY_IMAGE: ImageStyle = {
  width: 175,
  height: 125,
  marginBottom: spacing[1],
  borderRadius: Platform.select({ ios: 6, android: 4 }),
}

const EMPTY_CARD_WRAPPER: ViewStyle = {
  width: 175,
  height: 125,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing[1],
  borderRadius: Platform.select({ ios: 6, android: 4 }),
  backgroundColor: color.inputPlaceholderBackground,
}

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
    style={SEARCH_ENTRY_WRAPPER}
  >
    <ContextMenuView
      onPressMenuItem={({ nativeEvent }) => {
        const { actionKey } = nativeEvent

        if (actionKey === "hide") {
          props.onHide()
        }
      }}
      menuConfig={{
        menuTitle: props.name,
        menuItems: [
          {
            actionKey: "hide",
            actionTitle: translate("selectStation.hide"),
            menuAttributes: ["destructive"],
            icon: {
              iconType: "SYSTEM",
              iconValue: "trash",
            },
          },
        ],
      }}
    >
      <View style={SEARCH_ENTRY_IMAGE_WRAPPER}>
        {props.image ? (
          <Image source={props.image} style={SEARCH_ENTRY_IMAGE} />
        ) : (
          <View style={EMPTY_CARD_WRAPPER}>
            <Image
              source={require("../../../../assets/railway-station.png")}
              style={{ width: 48, height: 48, marginBottom: spacing[2], tintColor: color.dim }}
            />
          </View>
        )}
      </View>
    </ContextMenuView>
    <Text>{props.name}</Text>
  </TouchableScale>
)
