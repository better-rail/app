import axios, { AxiosInstance, isAxiosError } from "axios"
import { API_CONFIG } from "@/config/api-config"
import type { LanguageCode } from "@/i18n"
import type { StationDepartures } from "./station-departures.types"
import type { StationInfo } from "./station-info.types"

/**
 * The server's station endpoints: GET /api/v1/stations/:id/info — a station's page from
 * Israel Railways (entrances and their hours, facilities, notices), cleaned up and cached
 * by the server — and GET /api/v1/stations/:id/departures — the next trains calling there.
 */
export class StationInfoApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.STATIONS,
      timeout: 20000,
      headers: { Accept: "application/json" },
    })
  }

  /** The station's page in the given language, or null when there is none to show (the server has no source for it, or does not know the station). */
  async getStationInfo(stationId: string, locale: LanguageCode): Promise<StationInfo | null> {
    try {
      const response = await this.axiosInstance.get<StationInfo>(`/${stationId}/info`, { params: { locale } })
      const info = response.data
      if (!info || info.schemaVersion !== 1 || !Array.isArray(info.entrances)) {
        throw new Error("Unexpected station info payload")
      }
      return info
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined
      if (status === 404 || status === 503) return null
      throw error
    }
  }

  /** The next trains calling at the station, per line and direction; null when the server has no timetable to answer from. */
  async getDepartures(stationId: string): Promise<StationDepartures | null> {
    try {
      const response = await this.axiosInstance.get<StationDepartures>(`/${stationId}/departures`)
      const departures = response.data
      if (!departures || departures.schemaVersion !== 1 || !Array.isArray(departures.lines)) {
        throw new Error("Unexpected station departures payload")
      }
      return departures
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined
      if (status === 404 || status === 503) return null
      throw error
    }
  }
}

export const stationInfoApi = new StationInfoApi()
