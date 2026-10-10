import axios, { AxiosInstance, AxiosResponse, isAxiosError } from "axios"
import { API_CONFIG } from "@/config/api-config"
import type { FareProfile, FareProfilesResult, RouteFare } from "./fares-api.types"

/** True when the request never reached the server (offline, DNS, timeout) rather than the server answering with an error. */
export const isConnectionError = (error: unknown) => isAxiosError(error) && !error.response

export class FaresApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.FARES,
      timeout: 15000,
      headers: { Accept: "application/json" },
    })
  }

  /** The fare for a station pair, or null when the server has none for it. */
  async getRouteFare(originId: string, destinationId: string): Promise<RouteFare | null> {
    try {
      const response: AxiosResponse<RouteFare> = await this.axiosInstance.get("", {
        params: { from: originId, to: destinationId },
      })
      return response.data
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) return null
      throw error
    }
  }

  async getProfiles(): Promise<FareProfile[]> {
    const response: AxiosResponse<FareProfilesResult> = await this.axiosInstance.get("/profiles")
    return response.data.profiles
  }
}

export const faresApi = new FaresApi()
