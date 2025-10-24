import React, { useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextStyle, Platform, ActivityIndicator } from "react-native"
import { useIAP } from "react-native-iap"
import { Screen, Text } from "../../components"
import { color, isDarkMode, spacing } from "../../theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { translate } from "../../i18n"
import { useStores } from "../../models"
import { getInstallerPackageNameSync } from "react-native-device-info"
import { trackPurchase } from "../../services/analytics"
import { crashlytics } from "../../services/firebase/crashlytics"
import { useModal } from "react-native-modalfy"

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

const installSource = getInstallerPackageNameSync()

const PRODUCT_IDS = ["better_rail_tip_1", "better_rail_tip_2", "better_rail_tip_3", "better_rail_tip_4"]

export const TipJarScreen = observer(function TipJarScreen() {
  const [isLoading, setIsLoading] = useState(false)
  const [sortedProducts, setSortedProducts] = useState([])
  const { settings } = useStores()
  const { openModal } = useModal()

  const handlePurchaseSuccess = async (purchase) => {
    try {
      await finishTransaction({ purchase, isConsumable: true })

      openModal("TipThanksModal")

      const item = products.find((product) => product.id === purchase.productId)
      if (item) {
        settings.addTip(Number(item.price))

        try {
          await trackPurchase({
            value: Number(item.price),
            currency: products[0].currency,
            tax: 15,
            items: [
              {
                item_name: item.title,
                item_id: item.id,
                price: Number(item.price),
                quantity: 1,
              },
            ],
          })
        } catch (trackErr) {
          console.error('Failed to track purchase:', trackErr)
        }
      }
    } catch (err) {
      console.error('[TipJar] Error in purchase success handler:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePurchaseError = (error) => {
    setIsLoading(false)

    // Check if user cancelled the purchase
    if (error.code === 'user-cancelled') {
      throw new Error(error.message)
    } else {
      crashlytics.recordError(new Error(error.message))
      throw new Error(error.message)
    }
  }

  const { connected, products, finishTransaction, requestPurchase, fetchProducts } = useIAP({
    onPurchaseSuccess: handlePurchaseSuccess,
    onPurchaseError: handlePurchaseError,
  })

  useEffect(() => {
    if (connected) {
      fetchProducts({ skus: PRODUCT_IDS })
    }
  }, [connected, fetchProducts])

  useEffect(() => {
    if (products.length > 0) {
      const sortedProductsByPrice = products.sort((a, b) => Number(a.price) - Number(b.price))
      setSortedProducts(sortedProductsByPrice)
    }
  }, [products])

  const onTipButtonPress = async (sku: string) => {
    try {
      setIsLoading(true)

      // Request purchase - success/error will be handled by callbacks
      await requestPurchase({
        request: {
          ios: { sku },
          android: { skus: [sku] },
        },
        type: 'in-app',
      })
    } catch (err) {
      console.error('[TipJar] Error requesting purchase:', err)
      crashlytics.recordError(err)
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
      translucent
    >
      <Text style={HEART_ICON}>💖</Text>
      <Text tx="settings.tipJarTitle" style={TIP_INTRO_TITLE} />
      <Text tx="settings.tipJarSubtitle" style={TIP_INTRO_SUBTITLE} />
      {installSource === "TestFlight" && <Text tx="settings.testflightMessage" style={TESTFLIGHT_MSG} />}

      {sortedProducts.length > 0 && !isLoading ? (
        <>
          <TipRow
            title={translate("settings.generousTip")}
            amount={sortedProducts[0].displayPrice}
            onPress={() => onTipButtonPress(sortedProducts[0].id)}
          />
          <TipRow
            title={translate("settings.amazingTip")}
            amount={sortedProducts[1].displayPrice}
            onPress={() => onTipButtonPress(sortedProducts[1].id)}
          />
          <TipRow
            title={translate("settings.massiveTip")}
            amount={sortedProducts[2].displayPrice}
            onPress={() => onTipButtonPress(sortedProducts[2].id)}
          />
          <TipRow
            title={translate("settings.hugeTip")}
            amount={sortedProducts[3].displayPrice}
            onPress={() => onTipButtonPress(sortedProducts[3].id)}
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
