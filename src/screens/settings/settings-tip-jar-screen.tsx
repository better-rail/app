import React, { useEffect, useState } from "react"
import { View, Platform, ActivityIndicator } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useIAP } from "react-native-iap"
import { Screen, Text } from "@/components"
import { isDarkMode } from "@/theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { translate } from "@/i18n"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "@/models"
import { getInstallerPackageNameSync } from "react-native-device-info"
import { trackPurchase } from "@/services/analytics"
import { toast } from "burnt"
import { TipThanksModalNative } from "./components/tip-thanks-modal-native"
import * as Sentry from "@sentry/react-native"

const installSource = getInstallerPackageNameSync()

const PRODUCT_IDS = ["better_rail_tip_1", "better_rail_tip_2", "better_rail_tip_3", "better_rail_tip_4"]

export function TipJarScreen() {
  const [isLoading, setIsLoading] = useState(false)
  const [sortedProducts, setSortedProducts] = useState([])
  const [showThanksModal, setShowThanksModal] = useState(false)
  const { totalTip, addTip } = useSettingsStore(
    useShallow((s) => ({ totalTip: s.totalTip, addTip: s.addTip }))
  )

  const handlePurchaseSuccess = async (purchase) => {
    try {
      await finishTransaction({ purchase, isConsumable: true })

      setShowThanksModal(true)

      const item = products.find((product) => product.id === purchase.productId)
      if (item) {
        addTip(Number(item.price))

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
          console.error("Failed to track purchase:", trackErr)
        }
      }
    } catch (err) {
      console.error("[TipJar] Error in purchase success handler:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePurchaseError = (error) => {
    setIsLoading(false)

    if (error.code !== "user-cancelled") {
      toast({ title: translate("settings.purchaseFailed"), message: error.message, preset: "error" })
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
          apple: { sku },
          google: { skus: [sku] },
        },
        type: "in-app",
      })
    } catch (err) {
      console.error("[TipJar] Error requesting purchase:", err)
      Sentry.captureException(err)
      setIsLoading(false)
    }
  }

  return (
    <>
      <Screen
        style={styles.root}
        preset="scroll"
        unsafe={true}
        statusBar={Platform.select({ ios: "light-content" })}
        statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
        translucent
      >
        <Text style={styles.heartIcon}>💖</Text>
        <Text tx="settings.tipJarTitle" style={styles.tipIntroTitle} />
        <Text tx="settings.tipJarSubtitle" style={styles.tipIntroSubtitle} />
        {installSource === "TestFlight" && <Text tx="settings.testflightMessage" style={styles.testflightMsg} />}

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

            {totalTip > 0 && (
              <Text style={styles.totalTips}>
                {translate("settings.totalTips")}: {totalTip} {products[0].currency === "ILS" ? "₪" : "$"}
              </Text>
            )}
          </>
        ) : (
          <ActivityIndicator size="large" style={styles.activityIndicator} />
        )}
      </Screen>

      <TipThanksModalNative visible={showThanksModal} onClose={() => setShowThanksModal(false)} />
    </>
  )
}

const TipRow = ({ title, amount, onPress }) => (
  <View style={styles.listRow}>
    <Text>{title}</Text>
    <TouchableOpacity style={styles.tipButton} onPress={onPress} activeOpacity={0.6}>
      <Text style={styles.tipAmount}>{amount}</Text>
    </TouchableOpacity>
  </View>
)

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    paddingTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.background,
  },
  heartIcon: {
    fontSize: 68,
    textAlign: "center",
    marginBottom: theme.spacing[2],
  },
  tipIntroTitle: {
    fontSize: 21,
    textAlign: "center",
    fontWeight: "500",
    letterSpacing: -0.35,
    marginBottom: theme.spacing[2],
  },
  tipIntroSubtitle: {
    paddingHorizontal: theme.spacing[4] + 2,
    marginBottom: theme.spacing[4],
    fontSize: 16.5,
    textAlign: "center",
  },
  testflightMsg: {
    marginBottom: theme.spacing[4],
    fontWeight: "500",
    textAlign: "center",
    color: theme.colors.error,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2] + 2,
    marginHorizontal: theme.spacing[2],
    marginBottom: theme.spacing[2],
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: theme.colors.dim,
    shadowRadius: 0.5,
    shadowOpacity: 0.2,
    elevation: 1,
  },
  tipButton: {
    minWidth: 70,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.transparent,
    backgroundColor: theme.colors.success,
  },
  tipAmount: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
    color: theme.colors.whiteText,
  },
  totalTips: { textAlign: "center", marginTop: theme.spacing[4] },
  activityIndicator: { marginVertical: theme.spacing[5] },
}))
