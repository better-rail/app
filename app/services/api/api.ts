import axios, { AxiosInstance } from "axios"

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
}

export const railApi = new RailApi()
