import React from "react"
import { View, Platform } from "react-native"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import WidgetAnnouncement from "../../screens/new-features/widget-announce-screen"
import CloseButton from "../../components/close-button/close-button"
import { color } from "../../theme"
import WidgetStep1 from "../../screens/new-features/widget-setup-1"

export type NewFeaturesParamList = {
  main: undefined
  step1: undefined
}

const NewFeatureStack = createStackNavigator<NewFeatureStackProps>()

export type NewFeatureStackProps = StackScreenProps<NewFeaturesParamList, "main">

export const NewFeatureNavigator = () => (
  <NewFeatureStack.Navigator
    screenOptions={({ navigation }) => ({
      stackPresentation: "modal",
      headerTintColor: color.primary,
      headerBackTitleVisible: false,
      headerTitle: "",
      header: () => undefined,
    })}
  >
    <NewFeatureStack.Screen name="main" component={WidgetAnnouncement} />
    <NewFeatureStack.Screen name="step1" component={WidgetStep1} />
  </NewFeatureStack.Navigator>
)
