import { useEffect, useEffectEvent, useRef, useState } from "react"
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { useLocalSearchParams, useRouter } from "expo-router"
import HapticFeedback from "react-native-haptic-feedback"
import * as Sentry from "@sentry/react-native"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { voucherApi } from "@/services/api"
import { trackEvent } from "@/services/analytics"
import { extractVoucherCode } from "@/utils/helpers/voucher-helpers"
import { startSmsUserConsent, stopSmsUserConsent, subscribeToSmsUserConsent } from "@/utils/sms-user-consent-native"
import { CodeInput } from "./components/code-input"
import { trackVoucherFailure, voucherErrorText } from "./voucher-error"

const CODE_LENGTH = 5
const RESEND_COOLDOWN_SECONDS = 30

type CodeSource = "sms_consent" | "typed"

// Isolated left-to-right, so the dashes don't reorder the groups inside right-to-left text
const formatPhone = (phone: string) => `\u2066${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}\u2069`

export function VoucherCodeScreen() {
  const router = useRouter()
  const { theme } = useUnistyles()
  const { phone } = useLocalSearchParams<{ phone: string }>()

  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS)
  const [resendNotice, setResendNotice] = useState<string | null>(null)
  // SMS autofill can report the full code twice; a second verify of a spent code fails
  const verifyingRef = useRef(false)
  const resendingRef = useRef(false)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  const verify = async (enteredCode: string, source: CodeSource) => {
    if (verifyingRef.current) return
    verifyingRef.current = true
    setError(null)
    setIsVerifying(true)
    try {
      await voucherApi.verifyCode(phone, enteredCode)
      trackEvent("voucher_code_verified", { source })
      // The code is spent, so going back from the next step returns to the phone number
      router.replace({ pathname: "/voucher/passengers", params: { phone } })
    } catch (verifyError) {
      HapticFeedback.trigger("notificationError")
      setError(voucherErrorText(verifyError))
      setCode("")
      verifyingRef.current = false
      setIsVerifying(false)
      trackVoucherFailure("verify", verifyError)
    }
  }

  const resend = async () => {
    if (resendingRef.current) return
    resendingRef.current = true
    setError(null)
    setResendNotice(null)
    setResendIn(RESEND_COOLDOWN_SECONDS)
    try {
      void startSmsUserConsent()
      await voucherApi.sendCode(phone)
      setResendNotice(translate("voucher.codeResent"))
      trackEvent("voucher_code_resent")
    } catch (resendError) {
      trackVoucherFailure("resend", resendError)
      setError(voucherErrorText(resendError))
      // Nothing was sent, so there's nothing to wait for
      setResendIn(0)
    } finally {
      resendingRef.current = false
    }
  }

  // Typed covers the keyboard's SMS autofill too
  const onCodeChange = (value: string, source: CodeSource = "typed") => {
    setCode(value)
    if (value.length === CODE_LENGTH) verify(value, source)
  }

  const onSmsCode = useEffectEvent((smsCode: string) => onCodeChange(smsCode, "sms_consent"))

  // Android: the SMS the rider shares from the system prompt. Listening starts before the code is sent.
  useEffect(() => {
    const unsubscribe = subscribeToSmsUserConsent((message) => {
      const smsCode = extractVoucherCode(message, CODE_LENGTH)
      if (smsCode) onSmsCode(smsCode)
    })
    return () => {
      unsubscribe()
      stopSmsUserConsent()
    }
  }, [])

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>{translate("voucher.codeTitle")}</Text>
      <Sentry.Mask>
        <Text style={styles.subtitle}>
          {translate("voucher.codeSentTo", { phone: formatPhone(phone) })}
          {"  "}
          <Text style={styles.link} onPress={() => router.back()}>
            {translate("voucher.changeNumber")}
          </Text>
        </Text>

        <CodeInput
          value={code}
          length={CODE_LENGTH}
          onChange={onCodeChange}
          editable={!isVerifying}
          hasError={!!error && !isVerifying}
        />
      </Sentry.Mask>

      {isVerifying && (
        <View style={styles.progress}>
          <ActivityIndicator color={theme.colors.label} />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {!isVerifying && (
        <Pressable onPress={resend} disabled={resendIn > 0} hitSlop={8} style={styles.resend}>
          <Text style={[styles.link, resendIn > 0 && styles.linkDisabled]}>
            {resendIn > 0 ? translate("voucher.resendIn", { seconds: resendIn }) : translate("voucher.resend")}
          </Text>
        </Pressable>
      )}

      {resendNotice && !isVerifying && <Text style={styles.notice}>{resendNotice}</Text>}
    </ScrollView>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[5] + (Platform.OS === "android" ? rt.insets.ime : 0),
    gap: theme.spacing[4],
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: -theme.spacing[2],
    fontSize: 15,
    lineHeight: 21,
    color: theme.colors.label,
  },
  link: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  linkDisabled: {
    color: theme.colors.label,
  },
  progress: {
    alignItems: "center",
  },
  error: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    color: theme.colors.error,
  },
  resend: {
    alignSelf: "center",
  },
  notice: {
    fontSize: 14,
    textAlign: "center",
    color: theme.colors.greenText,
  },
}))
