import axios, { AxiosInstance } from "axios"
import { API_CONFIG } from "@/config/api-config"
import type { ServiceStatusSnapshot } from "./service-status.types"

/**
 * GET /api/v1/service-status — the network's health per line, derived on the
 * server from the GTFS timetable and the SIRI realtime snapshot.
 */
export class ServiceStatusApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.SERVICE_STATUS,
      timeout: 20000,
      headers: { Accept: "application/json" },
    })
  }

  async getServiceStatus(): Promise<ServiceStatusSnapshot> {
    const response = await this.axiosInstance.get<ServiceStatusSnapshot>("")
    const snapshot = response.data
    if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.lines)) {
      throw new Error("Unexpected service status payload")
    }
    return snapshot
  }
}

export const serviceStatusApi = new ServiceStatusApi()
