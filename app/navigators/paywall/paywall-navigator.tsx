import React from "react"
import { createStackNavigator, StackScreenProps, TransitionPresets } from "@react-navigation/stack"
import CloseButton from "../../components/close-button/close-button"
import { PaywallScreen } from "../../screens/paywall"

export type PaywallParamList = {
  main: undefined
}

const PaywallStack = createStackNavigator<PaywallParamList>()

export type PaywallScreenProps = StackScreenProps<PaywallParamList, "main">

export const PaywallNavigator = () => (
  <PaywallStack.Navigator>
    <PaywallStack.Screen
      name="main"
      component={PaywallScreen}
      options={({ navigation }) => ({
        headerTransparent: true,
        headerStatusBarHeight: 16,
        title: "",
        headerLeft: () => <CloseButton onPress={() => navigation.goBack()} iconStyle={{ tintColor: "grey" }} />,
      })}
    />
  </PaywallStack.Navigator>
)
