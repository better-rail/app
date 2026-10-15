import { useEffect } from "react"
import { Alert, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router"
import { QRCode } from "@ttsalpha/qrcode/native"
import { Button, Text } from "@/components"
import { translate } from "@/i18n"
import { useVouchersStore } from "@/models/vouchers/vouchers"
import { trackEvent } from "@/services/analytics"
import { VoucherHero } from "./components/voucher-hero"
import { closeVoucherFlow } from "./close-voucher-flow"

export function VoucherScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { code } = useLocalSearchParams<{ code: string }>()
  const voucher = useVouchersStore((s) => s.vouchers.find((v) => v.confirmationCode === code))

  useEffect(() => {
    trackEvent("voucher_viewed")
  }, [])

  if (!voucher) return null

  const confirmRemove = () =>
    Alert.alert(translate("voucher.removeTitle") ?? "", translate("voucher.removeMessage") ?? "", [
      { text: translate("common.cancel") ?? "", style: "cancel" },
      {
        text: translate("voucher.remove") ?? "",
        style: "destructive",
        onPress: () => {
          trackEvent("voucher_removed")
          useVouchersStore.getState().remove(voucher.confirmationCode)
          closeVoucherFlow(navigation.getParent(), router)
        },
      },
    ])

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      {/* A boarding pass: the trip on top, the scannable part below the tear line */}
      <View style={styles.passShadow}>
        <View style={styles.pass}>
          <VoucherHero
            trainNumber={voucher.trainNumber}
            departureTime={voucher.departureTime}
            arrivalTime={voucher.arrivalTime}
            fromStationId={voucher.fromStationId}
            toStationId={voucher.toStationId}
            style={styles.passHero}
          />

          <View style={styles.tearLine}>
            <View style={[styles.notch, styles.notchStart]} />
            <View style={styles.dashes}>
              {Array.from({ length: DASH_COUNT }, (_, index) => (
                <View key={index} style={styles.dash} />
              ))}
            </View>
            <View style={[styles.notch, styles.notchEnd]} />
          </View>

          <View style={styles.passBody}>
            {/* Encodes the confirmation code, like the QR rail.co.il shows after ordering */}
            <QRCode
              value={voucher.confirmationCode}
              size={180}
              margin={0}
              qr={{ errorCorrectionLevel: "M" }}
              backgroundColor="white"
              dotColor="black"
            />
            <Text style={styles.code} selectable>
              {formatConfirmationCode(voucher.confirmationCode)}
            </Text>
            <Text style={styles.passengers}>{translate("voucher.forPassengers", { count: voucher.passengers })}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.footnote}>{translate("voucher.cancelHint")}</Text>
      {/* The app can't tell when a voucher was cancelled by SMS, so the rider clears it to order again */}
      <Text style={styles.removeLink} onPress={confirmRemove} accessibilityRole="button">
        {translate("voucher.removeCancelled")}
      </Text>

      <View style={styles.doneButton}>
        <Button title={translate("common.done") ?? ""} onPress={() => closeVoucherFlow(navigation.getParent(), router)} />
      </View>
    </ScrollView>
  )
}

// Groups of four, isolated left to right so right-to-left text doesn't reorder them
const formatConfirmationCode = (code: string) => `\u2066${code.replace(/(\d{4})(?=\d)/g, "$1 ")}\u2069`

const NOTCH_SIZE = 20
// Separate views, since iOS draws a one-sided dashed border as a solid line
const DASH_COUNT = 22

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    flexGrow: 1,
    padding: theme.spacing[4],
    paddingBottom: Math.max(rt.insets.bottom, theme.spacing[4]),
    gap: theme.spacing[4],
  },
  // The shadow lives outside the clipped pass, or overflow: hidden would cut it off
  passShadow: {
    borderRadius: 24,
    borderCurve: "continuous",
    ...(rt.themeName === "dark"
      ? { borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" }
      : { shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }),
  },
  pass: {
    borderRadius: 24,
    borderCurve: "continuous",
    // White in dark mode too, so the QR code keeps its contrast for scanners
    backgroundColor: "white",
    overflow: "hidden",
  },
  passHero: {
    borderRadius: 0,
  },
  tearLine: {
    height: NOTCH_SIZE,
    flexDirection: "row",
    alignItems: "center",
  },
  // Half circles cut into the pass edges, in the screen's color
  notch: {
    width: NOTCH_SIZE,
    height: NOTCH_SIZE,
    borderRadius: NOTCH_SIZE / 2,
    backgroundColor: theme.colors.background,
  },
  notchStart: {
    marginStart: -NOTCH_SIZE / 2,
  },
  notchEnd: {
    marginEnd: -NOTCH_SIZE / 2,
  },
  dashes: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: theme.spacing[3],
  },
  dash: {
    width: 6,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "#c7c7cc",
  },
  passBody: {
    alignItems: "center",
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[5],
  },
  code: {
    marginTop: theme.spacing[4],
    fontSize: 20,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "black",
  },
  passengers: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: "600",
    color: "black",
  },
  footnote: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: theme.colors.label,
  },
  removeLink: {
    marginTop: -theme.spacing[3],
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    color: theme.colors.primary,
  },
  // Pinned to the bottom of the sheet, below the scrollable voucher
  doneButton: {
    marginTop: "auto",
  },
}))
