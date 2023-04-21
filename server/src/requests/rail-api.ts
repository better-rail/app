import http from "http"
import axiosRetry from "axios-retry"
import { AxiosInstance } from "axios"
import { ApisauceInstance, create } from "apisauce"

import { railUrl } from "../data/config"

http.globalAgent.maxSockets = 100

export class RailApi {
  apisauce: ApisauceInstance

  constructor() {
    this.apisauce = create({
      baseURL: railUrl,
      timeout: 30000,
      headers: {
        Accept: "application/json",
        "Ocp-Apim-Subscription-Key": "4b0d355121fe4e0bb3d86e902efe9f20",
      },
    })

    axiosRetry(this.apisauce.axiosInstance as AxiosInstance)
  }
}

export const railApi = new RailApi()
