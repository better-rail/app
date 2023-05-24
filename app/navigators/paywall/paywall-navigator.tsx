import React from "react"
import { CardStyleInterpolators, createStackNavigator, StackScreenProps, TransitionPresets } from "@react-navigation/stack"
import CloseButton from "../../components/close-button/close-button"
import { PaywallScreen } from "../../screens/paywall"
import { TransitionIOSSpec } from "@react-navigation/stack/lib/typescript/src/TransitionConfigs/TransitionSpecs"

export type PaywallParamList = {
  paywall: undefined
}

const PaywallStack = createStackNavigator<PaywallParamList>()

export type PaywallScreenProps = StackScreenProps<PaywallParamList, "paywall">

export const PaywallNavigator = () => (
  <PaywallStack.Navigator>
    <PaywallStack.Screen
      name="paywall"
      component={PaywallScreen}
      options={({ navigation }) => ({
        headerTransparent: true,
        title: "",
        headerLeft: () => (
          <CloseButton onPress={() => navigation.goBack()} style={{ marginStart: 6 }} iconStyle={{ tintColor: "grey" }} />
        ),
      })}
    />
  </PaywallStack.Navigator>
)
