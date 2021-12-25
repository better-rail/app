import React from "react"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import WidgetAnnouncement from "../../screens/new-features/widget-announce-screen"
import CloseButton from "../../components/close-button/close-button"

export type NewFeaturesParamList = {
  main: undefined
}

const NewFeatureStack = createStackNavigator<NewFeatureStackProps>()

export type NewFeatureStackProps = StackScreenProps<NewFeaturesParamList, "main">

export const NewFeatureNavigator = () => (
  <NewFeatureStack.Navigator
    screenOptions={{
      stackPresentation: "modal",
      headerTintColor: color.primary,
      headerBackTitleVisible: false,
    }}
  >
    <NewFeatureStack.Screen
      name="main"
      component={WidgetAnnouncement}
      options={({ navigation }) => ({
        headerLeft: () => <CloseButton onPress={() => navigation.goBack()} />,
      })}
    />
  </NewFeatureStack.Navigator>
)
