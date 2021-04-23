import React from "react"
import { Image, TouchableOpacity } from "react-native"
import { StackScreenProps } from "@react-navigation/stack"
import { createNativeStackNavigator } from "react-native-screens/native-stack"
import { VoucherFormScreen, VoucherTokenScreen, VoucherBarcodeScreen, VoucherOrganizerScreen } from "../screens"
import { color, typography } from "../theme"
import { Voucher } from "../models/vouchers"

export type VoucherParamList = {
  voucherForm: undefined
  voucherToken: undefined
  voucherBarcode: Voucher
  voucherOrganizer: undefined
}
const VoucherStack = createNativeStackNavigator<VoucherParamList>()

export type VoucherFormScreenProps = StackScreenProps<VoucherParamList, "voucherForm">
export type VoucherTokenScreenProps = StackScreenProps<VoucherParamList, "voucherToken">
export type VoucherBarcodeScreenProps = StackScreenProps<VoucherParamList, "voucherBarcode">
export type VoucherVoucherScreenProps = StackScreenProps<VoucherParamList, "voucherOrganizer">

export const VoucherNavigator = () => (
  <VoucherStack.Navigator
    screenOptions={{
      direction: "rtl",
      stackPresentation: "modal",
      title: "הזמנת שובר כניסה",
      headerTintColor: color.primary,
      headerTitleStyle: { fontSize: 20, fontFamily: typography.primary },
      headerBackTitleStyle: { fontFamily: typography.primary },
    }}
  >
    <VoucherStack.Screen
      name="voucherForm"
      component={VoucherFormScreen}
      options={({ navigation }) => ({
        headerLeft: () => <CloseIcon onPress={() => navigation.goBack()} />,
      })}
    />
    <VoucherStack.Screen
      name="voucherToken"
      component={VoucherTokenScreen}
      options={{ stackPresentation: "push", headerBackTitle: "חזרה" }}
    />
    <VoucherStack.Screen
      name="voucherBarcode"
      component={VoucherBarcodeScreen}
      options={{ stackPresentation: "push", headerHideBackButton: true, headerBackTitleVisible: false }}
    />

    <VoucherStack.Screen
      name="voucherOrganizer"
      component={VoucherOrganizerScreen}
      options={({ navigation }) => ({
        title: "שוברי כניסה",
        headerLeft: () => <CloseIcon onPress={() => navigation.goBack()} />,
      })}
    />
  </VoucherStack.Navigator>
)

const CloseIcon = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel="חזרה">
    <Image
      source={require("../../assets/close.png")}
      style={{ width: 37.5, height: 37.5, marginLeft: -10, tintColor: color.dim, opacity: 0.45 }}
    />
  </TouchableOpacity>
)
