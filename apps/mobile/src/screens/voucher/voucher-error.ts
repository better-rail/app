import { isAxiosError } from "axios"
import { translate, type TxKeyPath } from "@/i18n"
import { isConnectionError, voucherErrorMessage } from "@/services/api"

const KNOWN_ERROR_CODES = ["INVALID_OTP", "OTP_NOT_FOUND", "MAX_PASSENGERS_PER_TRIP_EXCEEDED"]

/** User-facing text for a failed voucher request. */
export function voucherErrorText(error: unknown): string {
  if (isConnectionError(error)) return translate("voucher.connectionError") ?? ""
  // The sign-in cookie lasts 5 minutes; past that, capacity and order calls are rejected
  if (isAxiosError(error) && error.response?.status === 401) return translate("voucher.codeExpired") ?? ""

  const message = voucherErrorMessage(error)
  if (message && KNOWN_ERROR_CODES.includes(message)) return translate(`voucher.errors.${message}` as TxKeyPath) ?? ""
  // Unmapped status codes (UPPER_SNAKE) aren't meant for people; free text is already localized
  if (message && !/^[A-Z_]+$/.test(message)) return message
  return translate("voucher.genericError") ?? ""
}

/** Analytics-safe failure category; free-text server messages are dropped. */
export function voucherErrorReason(error: unknown): string {
  if (isConnectionError(error)) return "connection"
  if (isAxiosError(error) && error.response?.status === 401) return "session_expired"

  const message = voucherErrorMessage(error)
  if (message && /^[A-Z_]+$/.test(message)) return message
  if (message) return "server_message"
  if (isAxiosError(error) && error.response) return `http_${error.response.status}`
  return "unknown"
}
