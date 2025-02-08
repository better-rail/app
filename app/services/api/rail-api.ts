import axios, { AxiosInstance, AxiosResponse } from "axios"
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

export class RailApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://israelrail.azurefd.net/rjpa-prod/api/v1/timetable/",
      timeout: 30000,
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": "4b0d355121fe4e0bb3d86e902efe9f20",
      },
    })
  }

  async getAnnouncements(languageCode: LanguageCode, relevantStationIds?: string[]): Promise<Announcement[]> {
    const languageId = railApiLocales[languageCode]

    const response: AxiosResponse<AnnouncementApiResult> = await this.axiosInstance.get(
      `/railupdates/?LanguageId=${languageId}&SystemType=1`,
      {
        baseURL: "https://israelrail.azurefd.net/common/api/v1/",
      },
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
      `/Stations/GetStationInformation?LanguageId=${languageId}&StationId=${stationId}&SystemType=1`,
      {
        baseURL: "https://israelrail.azurefd.net/common/api/v1/",
      },
    )

    return response.data.result
  }

  async getPopupMessages(languageCode: LanguageCode): Promise<PopUpMessage[]> {
    const languageId = railApiLocales[languageCode]

    const response: AxiosResponse<PopUpMessagesApiResult> = await this.axiosInstance.get(
      `/PopUpMessages/?LanguageId=${languageId}&PageTypeId=MainPage`,
      {
        baseURL: "https://israelrail.azurefd.net/common/api/v1/",
      },
    )

    return response.data.result.filter((result) => result.title && result.messageBody)
  }
}

export const railApi = new RailApi()
