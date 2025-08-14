import React from "react"
import {
  createStackNavigator,
  // StackHeaderInterpolatedStyle,
  // StackHeaderInterpolationProps,
  StackScreenProps,
} from "@react-navigation/stack"
import { PaywallScreen } from "../../screens/paywall"

export type PaywallParamList = {
  paywall: {
    /**
     * The presentation style of the screen.
     * This will impact the type of close button that will appear on the header - either a back button or a circular close button.
     */
    presentation: "modal" | "push"
  }
}

const PaywallStack = createStackNavigator<PaywallParamList>()

export type PaywallScreenProps = StackScreenProps<PaywallParamList, "paywall">

export const PaywallNavigator = () => (
  <PaywallStack.Navigator id="PaywallStack" {...({} as any)}>
    <PaywallStack.Screen
      name="paywall"
      component={PaywallScreen}
      options={({ navigation }) => ({
        headerTransparent: true,
      })}
    />
  </PaywallStack.Navigator>
)
