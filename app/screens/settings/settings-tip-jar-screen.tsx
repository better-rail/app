import React, { useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, Platform, ActivityIndicator } from "react-native"
import { ProductPurchase, Purchase, RequestPurchase, useIAP } from "react-native-iap"
import { Screen, Text } from "../../components"
import { color, isDarkMode, spacing } from "../../theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { translate } from "../../i18n"
import { TipThanksModal } from "./components/tip-thanks-modal"
import { useStores } from "../../models"
import { getInstallerPackageNameSync } from "react-native-device-info"
import analytics from "@react-native-firebase/analytics"
import crashlytics from "@react-native-firebase/crashlytics"

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
  paddingHorizontal: spacing[4] + 2,
  marginBottom: spacing[4],
  fontSize: 16.5,
  textAlign: "center",
}

const TESTFLIGHT_MSG: TextStyle = {
  marginBottom: spacing[4],
  fontWeight: "500",
  textAlign: "center",
  color: color.error,
}

const LIST_ROW: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing[3],
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
  minWidth: 70,
  paddingHorizontal: spacing[3],
  paddingVertical: spacing[1],
  borderRadius: 6,
  borderWidth: 1,
  borderColor: color.transparent,
  backgroundColor: color.success,
}

const TIP_AMOUNT: TextStyle = {
  fontSize: 14,
  textAlign: "center",
  fontWeight: "500",
  color: color.whiteText,
}

const TOTAL_TIPS: TextStyle = { textAlign: "center", marginTop: spacing[4] }

const PRODUCT_IDS = ["better_rail_tip_1", "better_rail_tip_2", "better_rail_tip_3", "better_rail_tip_4"]

const installSource = getInstallerPackageNameSync()

export const TipJarScreen = observer(function TipJarScreen() {
  const [isLoading, setIsLoading] = useState(false)
  const [thanksModalVisible, setModalVisible] = useState(false)
  const [sortedProducts, setSortedProducts] = useState([])
  const { settings } = useStores()

  const { connected, products, finishTransaction, requestPurchase, getProducts, getAvailablePurchases, availablePurchases } =
    useIAP()

  useEffect(() => {
    // see: https://github.com/dooboolab-community/react-native-iap/issues/126
    const flushAvailablePurchases = async () => {
      await getAvailablePurchases()
      availablePurchases.forEach(async (purchase) => {
        await finishTransaction({ purchase, isConsumable: true })
      })
    }

    if (connected) {
      getProducts({ skus: PRODUCT_IDS })

      flushAvailablePurchases()
    }
  }, [connected, getProducts])

  useEffect(() => {
    if (products.length > 0) {
      const sortedProductsByPrice = products.sort((a, b) => Number(a.price) - Number(b.price))
      setSortedProducts(sortedProductsByPrice)
    }
  }, [products])

  const onTipButtonPress = async (sku: string, amount: string) => {
    try {
      setIsLoading(true)

      const requestPurchaseParams: RequestPurchase = Platform.select({
        ios: { sku },
        android: { skus: [sku] },
      })

      const purchase = (await requestPurchase(requestPurchaseParams)) as ProductPurchase

      await finishTransaction({ purchase, isConsumable: true })
      setModalVisible(true)

      const item = products.find((product) => product.productId === sku)
      await analytics().logPurchase({
        value: Number(amount),
        currency: products[0].currency,
        tax: 15,
        items: [
          {
            item_name: item.title,
            item_id: item.productId,
            price: Number(amount),
            quantity: 1,
          },
        ],
      })

      settings.addTip(Number(amount))
    } catch (err) {
      crashlytics().recordError(err)
    } finally {
      setIsLoading(false)
    }
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
      {installSource === "TestFlight" && <Text tx="settings.testflightMessage" style={TESTFLIGHT_MSG} />}

      {sortedProducts.length > 0 && !isLoading ? (
        <>
          <TipRow
            title={translate("settings.generousTip")}
            amount={sortedProducts[0].localizedPrice}
            onPress={() => onTipButtonPress(sortedProducts[0].productId, sortedProducts[0].price)}
          />
          <TipRow
            title={translate("settings.amazingTip")}
            amount={sortedProducts[1].localizedPrice}
            onPress={() => onTipButtonPress(sortedProducts[1].productId, sortedProducts[1].price)}
          />
          <TipRow
            title={translate("settings.massiveTip")}
            amount={sortedProducts[2].localizedPrice}
            onPress={() => onTipButtonPress(sortedProducts[2].productId, sortedProducts[2].price)}
          />
          <TipRow
            title={translate("settings.hugeTip")}
            amount={sortedProducts[3].localizedPrice}
            onPress={() => onTipButtonPress(sortedProducts[3].productId, sortedProducts[3].price)}
          />

          {settings.totalTip > 0 && (
            <Text style={TOTAL_TIPS}>
              {translate("settings.totalTips")}: {settings.totalTip} {products[0].currency === "ILS" ? "₪" : "$"}
            </Text>
          )}
        </>
      ) : (
        <ActivityIndicator size="large" style={{ marginVertical: spacing[5] }} />
      )}

      <TipThanksModal isVisible={thanksModalVisible} onOk={() => setModalVisible(false)} />
    </Screen>
  )
})

const TipRow = ({ title, amount, onPress }) => (
  <View style={LIST_ROW}>
    <Text>{title}</Text>
    <TouchableOpacity style={TIP_BUTTON} onPress={onPress} activeOpacity={0.6}>
      <Text style={TIP_AMOUNT}>{amount}</Text>
    </TouchableOpacity>
  </View>
)
