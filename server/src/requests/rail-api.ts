import http from "http"
import axiosRetry from "axios-retry"
import axios, { AxiosInstance } from "axios"

import { railUrl } from "../data/config"

http.globalAgent.maxSockets = 100

export class RailApi {
  axiosInstance: AxiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: railUrl,
      timeout: 30000,
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": "4b0d355121fe4e0bb3d86e902efe9f20",
      },
    })

    axiosRetry(this.axiosInstance)
  }
}

export const railApi = new RailApi()
