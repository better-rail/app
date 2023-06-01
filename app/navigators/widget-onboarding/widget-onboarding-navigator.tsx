import React from "react"
import { createStackNavigator, StackScreenProps } from "@react-navigation/stack"
import { WidgetAnnouncement, WidgetStep1, WidgetStep2, WidgetStep3 } from "../../screens"
import { CloseButton } from "../../components"

export type WidgetOnboardingsParamList = {
  main: undefined
  step1: undefined
  step2: undefined
  step3: undefined
}

const WidgetOnboardingStack = createStackNavigator<WidgetOnboardingsParamList>()

export type WidgetOnboardingStackProps = StackScreenProps<WidgetOnboardingsParamList, "main">

export const WidgetOnboardingNavigator = () => (
  <WidgetOnboardingStack.Navigator
    screenOptions={({ navigation }) => ({
      headerTransparent: true,
      title: "",
      headerLeft: () => (
        <CloseButton
          iconStyle={{ width: 32.5, height: 32.5, tintColor: "white", opacity: 0.45 }}
          onPress={() => navigation.navigate("settingsStack")}
        />
      ),
    })}
  >
    <WidgetOnboardingStack.Screen name="main" component={WidgetAnnouncement} />
    <WidgetOnboardingStack.Screen name="step1" component={WidgetStep1} />
    <WidgetOnboardingStack.Screen name="step2" component={WidgetStep2} />
    <WidgetOnboardingStack.Screen name="step3" component={WidgetStep3} />
  </WidgetOnboardingStack.Navigator>
)
