import axios, { AxiosInstance, AxiosResponse } from "axios"
import { LanguageCode } from "../../i18n"
import { AnnouncementApiResult } from "./api.types"

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

  async getAnnouncements(languageCode: LanguageCode) {
    let languageId = 1 // hebrew
    if (languageCode === "en") languageId = 2
    if (languageCode === "ar") languageId = 3
    if (languageCode === "ru") languageId = 4

    const response: AxiosResponse<AnnouncementApiResult> = await this.axiosInstance.get(
      `/railupdates/?LanguageId=${languageId}&SystemType=1`,
      {
        baseURL: "https://israelrail.azurefd.net/common/api/v1/",
      },
    )

    return response.data.result
  }
}

export const railApi = new RailApi()
