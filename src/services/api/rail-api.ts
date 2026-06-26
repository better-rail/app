import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios"
import { LanguageCode, railApiLocales } from "../../i18n"
import { isEmpty } from "lodash"
import {
  Announcement,
  PopUpMessage,
  AnnouncementApiResult,
  PopUpMessagesApiResult,
  StationInfoApiResult,
  StationInfo,
} from "./rail-api.types"
import { railApiKey, API_CONFIG } from "../../config/api-config"
import { setAnalyticsUserProperty } from "../../services/analytics"

export class RailApi {
  axiosInstance: AxiosInstance
  private hasFallenBackToProxy = false

  constructor() {
    setAnalyticsUserProperty("rail_api", "direct")
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.DIRECT_RAIL_API,
      timeout: 30000,
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": railApiKey,
      },
    })

    // Add response interceptor to handle 403 errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const { response, config } = error

        // If we get a 403 error and haven't fallen back to proxy yet
        if (response?.status === 403 && !this.hasFallenBackToProxy) {
          this.hasFallenBackToProxy = true

          setAnalyticsUserProperty("rail_api", "proxy")
          this.axiosInstance.defaults.baseURL = API_CONFIG.PROXY_RAIL_API

          const originalRequest = config
          return this.axiosInstance.request(originalRequest)
        }

        // If we've already fallen back to proxy or it's not a 403 error, reject the promise
        return Promise.reject(error)
      },
    )
  }

  async getAnnouncements(languageCode: LanguageCode, relevantStationIds?: string[]): Promise<Announcement[]> {
    const languageId = railApiLocales[languageCode]

    const response: AxiosResponse<AnnouncementApiResult> = await this.axiosInstance.get(
      `/common/api/v1/railupdates/?LanguageId=${languageId}&SystemType=1`,
    )

    const announcements = response.data.result

    if (isEmpty(relevantStationIds)) {
      return announcements
    }

    // Filter related updates to the route
    // if the announcement stations length equals 0, it means that the update is relevant to all stations
    return announcements.filter(
      (announcement) =>
        announcement.stations.length === 0 || relevantStationIds.some((stationId) => announcement.stations.includes(stationId)),
    )
  }

  async getStationInfo(languageCode: LanguageCode, stationId: string): Promise<StationInfo> {
    const languageId = railApiLocales[languageCode]

    const response: AxiosResponse<StationInfoApiResult> = await this.axiosInstance.get(
      `/common/api/v1/Stations/GetStationInformation?LanguageId=${languageId}&StationId=${stationId}&SystemType=1`,
    )

    return response.data.result
  }

  async getPopupMessages(languageCode: LanguageCode): Promise<PopUpMessage[]> {
    const languageId = railApiLocales[languageCode]

    const response: AxiosResponse<PopUpMessagesApiResult> = await this.axiosInstance.get(
      `/common/api/v1/PopUpMessages/?LanguageId=${languageId}&PageTypeId=MainPage`,
    )

    return response.data.result.filter((result) => result.title && result.messageBody)
  }
}

export const railApi = new RailApi()
