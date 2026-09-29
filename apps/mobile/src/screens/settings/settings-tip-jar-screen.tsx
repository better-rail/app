import React from "react"
import { View, Platform, ActivityIndicator } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text } from "@/components"
import { isDarkMode } from "@/theme"
import { TouchableOpacity } from "react-native-gesture-handler"
import { translate } from "@/i18n"
import { useSettingsStore } from "@/models"
import { getInstallerPackageNameSync } from "react-native-device-info"
import { TipThanksModalNative } from "./components/tip-thanks-modal-native"

import { useTipIAP } from "@/services/iap/tip-iap-provider"
import { TIP_PRODUCT_IDS } from "@/services/iap/tip-purchases"

const installSource = getInstallerPackageNameSync()

export function TipJarScreen() {
  const { products, connected, isPurchasing, canTip, showThanksModal, dismissThanks, requestTip } = useTipIAP()
  const totalTip = useSettingsStore((state) => state.totalTip)
  const sortedProducts = products
    .filter((product) => TIP_PRODUCT_IDS.includes(product.id))
    .sort((a, b) => Number(a.price) - Number(b.price))

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

        {connected && sortedProducts.length === TIP_PRODUCT_IDS.length && !isPurchasing ? (
          <>
            <TipRow
              disabled={!canTip}
              title={translate("settings.generousTip") ?? ""}
              amount={sortedProducts[0].displayPrice}
              onPress={() => requestTip(sortedProducts[0].id)}
            />
            <TipRow
              disabled={!canTip}
              title={translate("settings.amazingTip") ?? ""}
              amount={sortedProducts[1].displayPrice}
              onPress={() => requestTip(sortedProducts[1].id)}
            />
            <TipRow
              disabled={!canTip}
              title={translate("settings.massiveTip") ?? ""}
              amount={sortedProducts[2].displayPrice}
              onPress={() => requestTip(sortedProducts[2].id)}
            />
            <TipRow
              disabled={!canTip}
              title={translate("settings.hugeTip") ?? ""}
              amount={sortedProducts[3].displayPrice}
              onPress={() => requestTip(sortedProducts[3].id)}
            />

            {totalTip > 0 && (
              <Text style={styles.totalTips}>
                {translate("settings.totalTips")}: {totalTip} {sortedProducts[0].currency === "ILS" ? "₪" : "$"}
              </Text>
            )}
          </>
        ) : (
          <ActivityIndicator size="large" style={styles.activityIndicator} />
        )}
      </Screen>

      <TipThanksModalNative visible={showThanksModal} onClose={dismissThanks} />
    </>
  )
}

interface TipRowProps {
  disabled: boolean
  title: string
  amount: string
  onPress: () => void
}

const TipRow = ({ title, amount, onPress, disabled }: TipRowProps) => (
  <View style={styles.listRow}>
    <Text>{title}</Text>
    <TouchableOpacity
      style={[styles.tipButton, { opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={disabled}
      accessibilityState={{ disabled }}
    >
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
