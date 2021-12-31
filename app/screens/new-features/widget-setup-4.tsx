import React from "react"
import { View, TextStyle, ViewStyle, ImageStyle, Image, Dimensions } from "react-native"
import * as storage from "../../utils/storage"
import { Screen, Text, Button } from "../../components"
import { translate } from "../../i18n"
import { NewFeatureStackProps } from "../../navigators/new-features/new-features-navigator"
import { color, spacing } from "../../theme"
import { NewFeatureBackground } from "./new-features-background"
import InAppReview from "react-native-in-app-review"
import { useStores } from "../../models"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { inlineStyles } from "react-native-svg"

const { width: deviceWidth } = Dimensions.get("screen")

const GARDIENT: ViewStyle = {
  height: "200%",
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  opacity: 1,
}

const TITLE: TextStyle = {
  color: color.whiteText,
  marginBottom: spacing[2],
  fontSize: 32,
  textAlign: "center",
}

const TEXT: TextStyle = {
  color: color.whiteText,
  marginBottom: spacing[2],
  lineHeight: 24.5,
}

const IMAGE_CONTAINER: ViewStyle = {
  alignItems: "center",
  overflow: "hidden",
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.palette.black,
  shadowRadius: 5,
  shadowOpacity: 0.5,
}

const IMAGE_STYLE: ImageStyle = {
  width: 200,
  height: 200,
  marginTop: spacing[2],
  marginBottom: spacing[4],
  alignSelf: "center",
}

export const WidgetStep4 = function WidgetStep4({ navigation }: NewFeatureStackProps) {
  const insets = useSafeAreaInsets()
  const { recentSearches } = useStores()

  return (
    <Screen unsafe={true} statusBar="light-content" preset="scroll">
      <NewFeatureBackground />
      <View style={{ paddingHorizontal: spacing[6], marginTop: spacing[6] + 4 }}>
        <Text preset="header" style={TITLE} tx="newFeature.enjoyTheWidgets" />

        <Text style={[TEXT, { textAlign: "center", fontWeight: "500", marginBottom: spacing[4] }]} tx="newFeature.myCreator" />
        <Image source={require("../../../assets/guymoji.png")} style={IMAGE_STYLE} />

        <Text style={TEXT} tx="newFeature.heyThere" />
        <Text style={TEXT} tx="newFeature.pleaseConsider" />

        <Text style={[TEXT, { marginBottom: spacing[6] }]} tx="newFeature.goodbyes" />
      </View>
      <View style={{ alignItems: "center", marginBottom: insets.bottom + 4, marginTop: spacing[2] }}>
        <Button
          title={translate("common.done")}
          onPress={() => {
            storage.save("seenWidgetAnnouncement", "true")

            navigation.navigate("planner")

            if (recentSearches.entries.length > 3) {
              storage.load("lastInAppReview").then((value) => {
                if (!value) {
                  InAppReview.RequestInAppReview().then((value) => {
                    console.log(value)
                    storage.save("lastInAppReview", new Date().toISOString())
                  })
                }
              })
            }
          }}
          containerStyle={{ width: deviceWidth - 40 }}
        />
      </View>
    </Screen>
  )
}
