import React, { useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, Platform } from "react-native"
import { useIAP } from "react-native-iap"
import { Screen, Text } from "../../components"
import { color, isDarkMode, spacing } from "../../theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { translate } from "../../i18n"
import { TipThanksModal } from "./components/tip-thanks-modal"

const ROOT: ViewStyle = {
  flex: 1,
  paddingTop: spacing[4],
  paddingHorizontal: spacing[4],
  backgroundColor: color.background,
}

const HEART_ICON: TextStyle = {
  fontSize: 68,
  textAlign: "center",
  marginBottom: spacing[2],
}

const TIP_INTRO_TITLE: TextStyle = {
  fontSize: 21,
  textAlign: "center",
  fontWeight: "500",
  letterSpacing: -0.35,
  marginBottom: spacing[2],
}

const TIP_INTRO_SUBTITLE: TextStyle = {
  fontSize: 16.5,
  textAlign: "center",
  marginBottom: spacing[4],
}

const LIST_ROW: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing[4],
  paddingVertical: spacing[2] + 2,
  marginHorizontal: spacing[2],
  marginBottom: spacing[2],
  backgroundColor: color.secondaryBackground,
  borderRadius: 10,
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.dim,
  shadowRadius: 0.5,
  shadowOpacity: 0.2,
  elevation: 1,
}

const TIP_BUTTON: ViewStyle = {
  paddingHorizontal: spacing[3],
  paddingVertical: spacing[1],
  borderRadius: 6,
  borderWidth: 1,
  borderColor: color.transparent,
  backgroundColor: color.success,
}

const TOTAL_TIPS: TextStyle = { textAlign: "center", marginTop: spacing[4] }

const PRODUCT_IDS = ["better_rail_tip_1", "better_rail_tip_2", "better_rail_tip_3"]

export const TipJarScreen = observer(function TipJarScreen() {
  const [thanksModalVisible, setModalVisible] = useState(false)

  const {
    connected,
    products,
    promotedProductsIOS,
    subscriptions,
    purchaseHistories,
    availablePurchases,
    currentPurchase,
    currentPurchaseError,
    finishTransaction,
    getProducts,
    getAvailablePurchases,
    getPurchaseHistories,
  } = useIAP()

  useEffect(() => {
    if (connected) {
      getProducts(PRODUCT_IDS).then((result) => console.log(result))
    }
  }, [connected, getProducts])

  const onTipButtonPress = () => {
    setModalVisible(true)
  }

  return (
    <Screen
      style={ROOT}
      preset="scroll"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
    >
      <Text style={HEART_ICON}>💖</Text>
      <Text tx="settings.tipJarTitle" style={TIP_INTRO_TITLE} />
      <Text tx="settings.tipJarSubtitle" style={TIP_INTRO_SUBTITLE} />

      <TipRow title={translate("settings.generousTip")} amount={2.99} onPress={onTipButtonPress} />
      <TipRow title={translate("settings.amazingTip")} amount={4.99} onPress={onTipButtonPress} />
      <TipRow title={translate("settings.massiveTip")} amount={9.99} onPress={onTipButtonPress} />

      <Text style={TOTAL_TIPS}>Total Tip: 2.99 $</Text>

      <TipThanksModal isVisible={thanksModalVisible} onOk={() => setModalVisible(false)} />
    </Screen>
  )
})

const TipRow = ({ title, amount, onPress }) => (
  <View style={LIST_ROW}>
    <Text>{title}</Text>
    <TouchableOpacity style={TIP_BUTTON} onPress={onPress} activeOpacity={0.6}>
      <Text style={{ fontSize: 14, fontWeight: "500", color: color.whiteText }}>{amount} $</Text>
    </TouchableOpacity>
  </View>
)
