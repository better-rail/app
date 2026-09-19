import axios, { AxiosInstance } from "axios"
import { API_CONFIG } from "@/config/api-config"
import type { DelayGuardSubscription } from "./delay-guards.types"

/** PUT / DELETE /api/v1/delay-guards — the trains this device wants to hear about when they run late. */
export class DelayGuardsApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.DELAY_GUARDS,
      timeout: 20000,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    })
  }

  async subscribe(subscription: DelayGuardSubscription): Promise<void> {
    const response = await this.axiosInstance.put<{ success: boolean }>("", subscription)
    if (!response.data?.success) throw new Error("Delay Guard subscription was not accepted")
  }

  async unsubscribe(token: string): Promise<void> {
    const response = await this.axiosInstance.delete<{ success: boolean }>("", { data: { token } })
    if (!response.data?.success) throw new Error("Delay Guard unsubscribe was not accepted")
  }
}

export const delayGuardsApi = new DelayGuardsApi()
