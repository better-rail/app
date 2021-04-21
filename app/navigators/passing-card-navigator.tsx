import React from "react"
import { createNativeStackNavigator, NativeStackNavigationProp } from "react-native-screens/native-stack"
import { PassingCardFormScreen, PassingCardTokenScreen, PassingCardBarcodeScreen } from "../screens"
import { color, typography } from "../theme"

export type PassingCardParamList = { passingCardForm: undefined; passingCardToken: undefined; passingCardBarcode: undefined }
const PCardStack = createNativeStackNavigator<PassingCardParamList>()

export type PassingCardFormScreenProps = NativeStackNavigationProp<PassingCardParamList, "passingCardForm">
export type PassingCardTokenScreenProps = NativeStackNavigationProp<PassingCardParamList, "passingCardToken">

export const PassingCardNavigator = () => (
  <PCardStack.Navigator
    screenOptions={{
      direction: "rtl",
      stackPresentation: "modal",
      title: "הזמנת שובר כניסה",
      headerTintColor: color.primary,
      headerTitleStyle: { fontSize: 20, fontFamily: typography.primary },
      headerBackTitleStyle: { fontFamily: typography.primary },
    }}
  >
    <PCardStack.Screen name="passingCardForm" component={PassingCardFormScreen} />
    <PCardStack.Screen
      name="passingCardToken"
      component={PassingCardTokenScreen}
      options={{ stackPresentation: "push", headerBackTitle: "חזרה", title: "אישור קוד מזהה" }}
    />
    <PCardStack.Screen
      name="passingCardBarcode"
      component={PassingCardBarcodeScreen}
      options={{ stackPresentation: "push", headerBackTitle: "", title: "שובר כניסה" }}
    />
  </PCardStack.Navigator>
)
