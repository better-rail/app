/**
 * device-api.ts — syncs the device's state to its object on the server (`/device`).
 *
 * The device id and secret travel only in headers (`X-Device-Id`, `Authorization: Bearer`), never in the URL.
 * Every failure comes back as a plain `DeviceApiError` with the HTTP status at most: an axios error carries the
 * request's headers in its `config`, and a caller that reported it to Sentry would leak the credentials.
 */
import axios, { AxiosInstance } from "axios"

import { serverBaseURL } from "@/config/api-config"
import { clearDeviceIdentity, DeviceIdentity, getDeviceIdentity, peekDeviceIdentity } from "@/services/device/identity"

export type RecurringRideMode = "auto" | "notify"

/** A ride the device repeats on given weekdays (mirrors the server's `RecurringRideSchema`). */
export type RecurringRide = {
  id: string
  originId: number
  destinationId: number
  viaStationId?: number
  /** "HH:mm", Israel time */
  departureTime: string
  /** 0 = Sunday … 6 = Saturday */
  days: number[]
  leadMinutes: number
  mode: RecurringRideMode
  enabled: boolean
  /** "YYYY-MM-DD" dates the ride is skipped on */
  skipDates: string[]
}

/** The device's whole state; every sync replaces what the server held (mirrors the server's `DeviceStateSchema`). */
export type DeviceSyncState = {
  platform: "ios" | "android"
  locale: "he" | "en" | "ru" | "ar"
  appVersion: string
  tokens: { pushToStart?: string; apns?: string; fcm?: string }
  supportsPushToStart: boolean
  recurringRides: RecurringRide[]
}

export class DeviceApiError extends Error {
  constructor(
    message: string,
    /** The HTTP status, when the server answered */
    readonly status?: number,
  ) {
    super(message)
    this.name = "DeviceApiError"
  }
}

const sanitize = (action: string, error: unknown) => {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  const reason = status ? `HTTP ${status}` : axios.isAxiosError(error) ? (error.code ?? "network error") : "unexpected error"
  return new DeviceApiError(`Couldn't ${action} the device: ${reason}`, status)
}

const authHeaders = ({ deviceId, secret }: DeviceIdentity) => ({
  "X-Device-Id": deviceId,
  Authorization: `Bearer ${secret}`,
})

export class DeviceApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: serverBaseURL,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    })
  }

  /** Replaces the server's copy of the device's state; the first sync registers the device. */
  async syncDevice(state: DeviceSyncState): Promise<void> {
    const identity = await getDeviceIdentity()
    try {
      await this.axiosInstance.put("/device", state, { headers: authHeaders(identity) })
    } catch (error) {
      throw sanitize("sync", error)
    }
  }

  /**
   * "Delete my data": wipes the device's state on the server, then forgets the identity so a later sync starts a new
   * one. A 404 means the server holds nothing under this identity, which is what was asked for.
   */
  async deleteDevice(): Promise<void> {
    const identity = await peekDeviceIdentity()
    // Never synced: the server has nothing for this device.
    if (!identity) return
    try {
      await this.axiosInstance.delete("/device", { headers: authHeaders(identity) })
    } catch (error) {
      if (!(axios.isAxiosError(error) && error.response?.status === 404)) throw sanitize("delete", error)
    }
    await clearDeviceIdentity()
  }
}

export const deviceApi = new DeviceApi()
