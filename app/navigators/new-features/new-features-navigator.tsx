import React from "react"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { WidgetAnnouncement, WidgetStep1, WidgetStep2, WidgetStep3, WidgetStep4 } from "../../screens"
import { color } from "../../theme"

export type NewFeaturesParamList = {
  main: undefined
  step1: undefined
  step2: undefined
  step3: undefined
}

const NewFeatureStack = createStackNavigator<NewFeatureStackProps>()

export type NewFeatureStackProps = StackScreenProps<NewFeaturesParamList, "main">

export const NewFeatureNavigator = () => (
  <NewFeatureStack.Navigator
    screenOptions={({ navigation }) => ({
      stackPresentation: "modal",
      headerTintColor: color.primary,
      header: () => undefined,
    })}
  >
    <NewFeatureStack.Screen name="main" component={WidgetAnnouncement} />
    <NewFeatureStack.Screen name="step1" component={WidgetStep1} />
    <NewFeatureStack.Screen name="step2" component={WidgetStep2} />
    <NewFeatureStack.Screen name="step3" component={WidgetStep3} />
    <NewFeatureStack.Screen name="step4" component={WidgetStep4} />
  </NewFeatureStack.Navigator>
)
