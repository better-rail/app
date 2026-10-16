import { useEffect, useRef, useState } from "react"
import { Platform, ScrollView, TextInput } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { useRouter } from "expo-router"
import * as Sentry from "@sentry/react-native"
import { Button, Text } from "@/components"
import { translate } from "@/i18n"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { useVouchersStore } from "@/models/vouchers/vouchers"
import { voucherApi } from "@/services/api"
import { trackEvent } from "@/services/analytics"
import { normalizeIsraeliMobile } from "@/utils/helpers/voucher-helpers"
import { VoucherHero } from "./components/voucher-hero"
import { trackVoucherFailure, voucherErrorText } from "./voucher-error"

/** First step: the mobile number Israel Rail texts the code and the voucher to. */
export function VoucherOrderScreen() {
  const router = useRouter()
  const { theme } = useUnistyles()
  const train = useNavigationParamsStore((s) => s.voucherTrain)
  const savedPhone = useVouchersStore((s) => s.phone)

  const [phone, setPhone] = useState(savedPhone)
  const [isSending, setIsSending] = useState(false)
  // The keyboard's send key bypasses the disabled button, and state lags a fast second tap
  const sendingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    trackEvent("voucher_started")
  }, [])

  if (!train) return null

  const sendCode = async () => {
    if (sendingRef.current) return
    const normalizedPhone = normalizeIsraeliMobile(phone)
    if (!normalizedPhone) {
      setError(translate("voucher.invalidPhone"))
      return
    }

    setError(null)
    sendingRef.current = true
    setIsSending(true)
    try {
      await voucherApi.sendCode(normalizedPhone)
      useVouchersStore.getState().setPhone(normalizedPhone)
      trackEvent("voucher_code_sent")
      router.push({ pathname: "/voucher/code", params: { phone: normalizedPhone } })
    } catch (sendError) {
      setError(voucherErrorText(sendError))
      trackVoucherFailure("send_code", sendError)
    } finally {
      sendingRef.current = false
      setIsSending(false)
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.content}
    >
      <VoucherHero
        trainNumber={train.trainNumber}
        departureTime={train.departureTime}
        arrivalTime={train.arrivalTime}
        fromStationId={train.originStationId}
        toStationId={train.destinationStationId}
        height={176}
        style={styles.hero}
      />

      <Text style={styles.title}>{translate("voucher.phoneTitle")}</Text>
      <Text style={styles.subtitle}>{translate("voucher.phoneHint")}</Text>

      <Sentry.Mask>
        <TextInput
          value={phone}
          onChangeText={(text) => {
            setPhone(text)
            setError(null)
          }}
          placeholder="050-123-4567"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoFocus={!savedPhone}
          returnKeyType="send"
          onSubmitEditing={sendCode}
          style={[styles.phoneInput, !!error && styles.phoneInputError]}
          placeholderTextColor={theme.colors.placeholder}
        />
      </Sentry.Mask>

      {/* Reserved even when empty, so an error doesn't shift the button */}
      <Text style={styles.error}>{error ?? ""}</Text>

      <Button
        title={translate("voucher.sendCode") ?? ""}
        onPress={sendCode}
        loading={isSending}
        disabled={isSending || !phone}
        containerStyle={styles.button}
      />

      <Text style={styles.privacyNote}>{translate("voucher.privacyNote")}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    padding: theme.spacing[4],
    // iOS insets the keyboard through automaticallyAdjustKeyboardInsets
    paddingBottom: theme.spacing[5] + (Platform.OS === "android" ? rt.insets.ime : 0),
  },
  hero: {
    marginBottom: theme.spacing[4],
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: theme.spacing[4],
    fontSize: 15,
    color: theme.colors.label,
  },
  phoneInput: {
    height: 56,
    paddingHorizontal: theme.spacing[4],
    borderRadius: 14,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.separator,
    backgroundColor: theme.colors.inputBackground,
    fontFamily: theme.typography.primary,
    fontSize: 20,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: theme.colors.text,
  },
  phoneInputError: {
    borderWidth: 1.5,
    borderColor: theme.colors.error,
  },
  error: {
    minHeight: 20,
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.error,
  },
  button: {
    marginTop: theme.spacing[2],
  },
  privacyNote: {
    marginTop: theme.spacing[3],
    fontSize: 13,
    textAlign: "center",
    color: theme.colors.label,
  },
}))
