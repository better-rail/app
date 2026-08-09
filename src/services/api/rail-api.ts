import axios, { AxiosInstance, AxiosResponse } from "axios"
import { LanguageCode, railApiLocales } from "@/i18n"
import { isEmpty } from "lodash"
import {
  Announcement,
  PopUpMessage,
  AnnouncementApiResult,
  PopUpMessagesApiResult,
  StationInfoApiResult,
  StationInfo,
} from "./rail-api.types"
import { API_CONFIG } from "@/config/api-config"
import { setAnalyticsUserProperty } from "@/services/analytics"

export class RailApi {
  axiosInstance: AxiosInstance

  constructor() {
    // Everything goes through our server (GTFS timetable + SIRI realtime).
    // The announcements / popup messages / station info endpoints below are
    // retired server-side and answer empty — their UI is hidden behind the
    // flags in config/features.ts until the data has a new source.
    setAnalyticsUserProperty("rail_api", "server")
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.RAIL_API,
      timeout: 30000,
      headers: {
        Accept: "application/json",
      },
    })
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
