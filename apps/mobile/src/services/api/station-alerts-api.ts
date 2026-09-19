import axios, { AxiosInstance } from "axios"
import { API_CONFIG } from "@/config/api-config"
import type { StationAlertSubscription } from "./station-alerts.types"

/**
 * PUT / DELETE /api/v1/station-alerts — the stations (and lines) this device wants pushes about.
 * A PUT replaces the device's whole subscription, so the app always sends its full list.
 */
export class StationAlertsApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.STATION_ALERTS,
      timeout: 20000,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    })
  }

  async subscribe(subscription: StationAlertSubscription): Promise<void> {
    const response = await this.axiosInstance.put<{ success: boolean }>("", subscription)
    if (!response.data?.success) throw new Error("Station alerts subscription was not accepted")
  }

  async unsubscribe(token: string): Promise<void> {
    const response = await this.axiosInstance.delete<{ success: boolean }>("", { data: { token } })
    if (!response.data?.success) throw new Error("Station alerts unsubscribe was not accepted")
  }
}

export const stationAlertsApi = new StationAlertsApi()
