import React from "react"
import { StackScreenProps } from "@react-navigation/stack"
import { createNativeStackNavigator, NativeStackNavigationProp } from "react-native-screens/native-stack"
import { VoucherFormScreen, VoucherTokenScreen, VoucherBarcodeScreen } from "../screens"
import { color, typography } from "../theme"

export type VoucherParamList = { VoucherForm: undefined; VoucherToken: undefined; VoucherBarcode: undefined }
const PCardStack = createNativeStackNavigator<VoucherParamList>()

export type VoucherFormScreenProps = StackScreenProps<VoucherParamList, "VoucherForm">
export type VoucherTokenScreenProps = StackScreenProps<VoucherParamList, "VoucherToken">
export type VoucherBarcodeScreenProps = StackScreenProps<VoucherParamList, "VoucherBarcode">

export const CreateVoucherNavigator = () => (
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
    <PCardStack.Screen name="VoucherForm" component={VoucherFormScreen} />
    <PCardStack.Screen
      name="VoucherToken"
      component={VoucherTokenScreen}
      options={{ stackPresentation: "push", headerBackTitle: "חזרה" }}
    />
    <PCardStack.Screen
      name="VoucherBarcode"
      component={VoucherBarcodeScreen}
      options={{ stackPresentation: "push", headerHideBackButton: true }}
    />
  </PCardStack.Navigator>
)
