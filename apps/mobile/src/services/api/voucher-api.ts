import axios, { AxiosInstance, isAxiosError } from "axios"
import { railApiLocales, userLocale } from "@/i18n"
import { RAIL_WEBSITE_API } from "@/config/api-config"
import type { CapacityLimit, OrderVoucherParams, RailEnvelope, TrainRemainingCapacity, VoucherConfig } from "./voucher-api.types"

const SYSTEM_TYPE = 2

/** A failed voucher request, carrying the server's (localized) message when it sent one. */
export class VoucherApiError extends Error {
  constructor(
    message: string,
    readonly serverMessage?: string,
  ) {
    super(message)
  }
}

/** The text to show for a failed voucher request: the server's own message, or null for a generic one. */
export function voucherErrorMessage(error: unknown): string | null {
  if (error instanceof VoucherApiError) return error.serverMessage ?? null
  if (isAxiosError<RailEnvelope<unknown>>(error)) {
    const body = error.response?.data
    return body?.result?.errorMessage ?? body?.errorMessages?.[0] ?? null
  }
  return null
}

function unwrap<T>(envelope: RailEnvelope<T>): T {
  const result = envelope.result
  if (!result?.success) {
    const serverMessage = result?.errorMessage ?? envelope.errorMessages?.[0] ?? undefined
    throw new VoucherApiError("Voucher request failed", serverMessage)
  }
  return result.data
}

/**
 * Israel Rail's Jerusalem entry vouchers, called straight from the device so riders' phone numbers
 * and SMS codes never pass through our server. Verifying a code sets a 5-minute `authToken` cookie
 * that the capacity and order calls rely on.
 */
export class VoucherApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: RAIL_WEBSITE_API.BASE_URL,
      timeout: 20000,
      // On iOS, React Native only sends and stores cookies for requests made with credentials
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": RAIL_WEBSITE_API.SUBSCRIPTION_KEY,
      },
    })
  }

  private get languageId() {
    return railApiLocales[userLocale]
  }

  async getConfig(): Promise<VoucherConfig> {
    // Unlike the other endpoints, `result` is the list itself rather than a { success, data } object
    const response = await this.axiosInstance.get<{ result: { key: string; value: string | null }[] | null }>(
      "/configuration/bysystemtype",
      { params: { systemTypeId: SYSTEM_TYPE } },
    )
    const values = Object.fromEntries((response.data.result ?? []).map((entry) => [entry.key, entry.value]))
    const numberOr = (key: string, fallback: number) => Number(values[key]) || fallback

    return {
      isActive: values.isCapacityLimitionActive === "true",
      bookingWindowHours: numberOr("reservationAvailableTime", 72),
      lateBookingMinutes: numberOr("ReservationMinutesLimit", 60),
      lowCapacityPercent: numberOr("VouchersLimitPercent", 5),
      defaultTrainCapacity: numberOr("DefaultTrainVouchers", 500),
    }
  }

  /** Seats left on every voucher train for a date (yyyy-MM-dd). Needs no sign-in. */
  async getRemainingCapacity(date: string): Promise<TrainRemainingCapacity[]> {
    const response = await this.axiosInstance.get<RailEnvelope<TrainRemainingCapacity[]>>(
      "/TripReservation/GetTrainsWithRemainingCapacity",
      { params: { date } },
    )
    return unwrap(response.data) ?? []
  }

  async sendCode(phone: string): Promise<void> {
    const response = await this.axiosInstance.post<RailEnvelope<null>>("/Otp/Send", {
      userContact: phone,
      type: "phone",
      languageId: this.languageId,
    })
    unwrap(response.data)
  }

  async verifyCode(phone: string, code: string): Promise<void> {
    const response = await this.axiosInstance.post<RailEnvelope<null>>("/Otp/Verify", {
      userContact: phone,
      type: "phone",
      otp: code,
      languageId: this.languageId,
    })
    unwrap(response.data)
  }

  /** How many vouchers the signed-in phone already holds on a train, and the per-phone cap. */
  async getCapacityLimit(trainNumber: number, departureDate: string): Promise<CapacityLimit> {
    const response = await this.axiosInstance.get<RailEnvelope<CapacityLimit>>("/TripReservation/GetCapacityLimit", {
      params: { trainNumber, departureDate, SystemTypeId: SYSTEM_TYPE },
    })
    return unwrap(response.data)
  }

  /** Books the vouchers and returns their confirmation code. Israel Rail also texts it to the rider. */
  async order(params: OrderVoucherParams): Promise<string> {
    const response = await this.axiosInstance.post<RailEnvelope<{ confirmationCode: string }>>(
      "/TripReservation/OrderSeatForTrip",
      {
        fromStation: String(params.fromStationId),
        toStation: String(params.toStationId),
        departureDate: params.departureDate,
        numberSeats: params.passengers,
        systemTypeId: String(SYSTEM_TYPE),
        trainNumber: params.trainNumber,
        type: "phone",
        languageId: this.languageId,
      },
    )
    const code = unwrap(response.data)?.confirmationCode
    // The website treats a non-numeric confirmation code as an error message
    if (!code || !/^\d+$/.test(code)) throw new VoucherApiError("Voucher order failed", code || undefined)
    return code
  }
}

export const voucherApi = new VoucherApi()
